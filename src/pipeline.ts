import {ulid} from '@nullserve/ulid'
import pQueue from 'async/priorityQueue'
import {reject} from 'lodash'
import {pool} from 'workerpool'


interface WebWorkerPoolOptions {
	script: string;
	concurrency: number;
}

interface Task {
	id: string;
	isTask: boolean;
	priority: number;
	progress: any[];
	start: number;
	finish: number | null;
	workItem: any;
}

interface Stage {
	name: string;
	worker: Function;
	priority: number;
	concurrency: number;
	index: number;
	q: any;
	pool: any;
	stage: (taskOrInitialWorkItem: any, customPriority?: number) => void;
}

interface PipelineOptions {
	poolImpl?: (opts: WebWorkerPoolOptions) => any;
	stageDefs?: StageDef[];
	saveCheckpoint?: (checkpoint: any) => void;
	loadCheckpoint?: (callback: (checkpoint: any) => void) => void;
	onUpdate?: (data: any) => void;
}

interface StageDef {
	name: string;
	worker: Function;
	concurrency: number;
}

function webWorkerPool({concurrency: maxWorkers, ...rest}: WebWorkerPoolOptions) {
	let p = pool({maxWorkers, ...rest});

	return {
		exec(worker: Function, args: [Task, Stage]) {
			p.exec(worker, args);
		},
		terminate() {
			p.terminate();
		}
	};
}

/*
 pipeline
 - priority queue 	can prioritize most recent user interactions
 - Worker-Pool 		offloads work to 1-n worker threads per stage
 - Pipeline 		work progresses through a series of stages

 ------------------- stage 1 light work -------------------
 Priority-Q [job6(1 item), job5(10 items), ...] -> (worker pool 1 worker)
 ------------------- stage 2 heavy work -------------------
 Priority-Q [job4(1 item), job3(10 items), ...] -> (worker pool 3 workers)
 ------------------- stage 3 heavy work -------------------
 Priority-Q [job2(1 item), job1(10 items), ...] -> (worker pool 2 workers)
 -----------------------------------------------

 a pipeline config consists of an array of stage definitions
 [{
	name: 'some stage name',
	worker: (task, stage) => nextTask, // tasks must be json serializable
	concurrency: 1 // also sets number of workers in pool

	// execution engine adds
	q: [task, ...], priority queue of tasks // https://caolan.github.io/async/v3/docs.html#queue
	pool: worker pool https://github.com/josdejong/workerpool#use
 }, ...]

 each successive stage is a log of the prior stage completed work
 each

*/

export default function pipeline({
	poolImpl = webWorkerPool,
	stageDefs = [],
	saveCheckpoint,
	loadCheckpoint,
	onUpdate
}: PipelineOptions) {
	let stages: Stage[] = [],
		tasks: Task[] = [];

	function addStage(stageDef) {
		let {name, worker, concurrency} = stageDef,
			pool = poolImpl({concurrency}),
			q = pQueue((task, next) => work(task, next), concurrency),
			index = stages.length,
			stage = {
				name,
				worker,
				priority: 1,
				concurrency,
				index,
				q,
				pool,
				stage(taskOrInitialWorkItem, customPriority) {
					let priority = customPriority || (stage.priority++), // increment for lifo-q behavior
						{isTask} = taskOrInitialWorkItem,
						task = isTask
							? taskOrInitialWorkItem
							: newTask(taskOrInitialWorkItem)

					progress(task, stage, 'staged')

					q.push(task, priority, (error, nextTask) => {
						if (error) {
							console.log(`${name} stage error:`, {error, stage})
							progress(task, stage, 'failed')
						} else {
							progress(task, stage, 'finished')
							let nextStage = stages[stage.index+1]
							checkpoint()
							nextStage?.stage(nextTask)
						}
					})
				}
			}

		function work(task, next) {
			progress(task, stage, 'started')
			pool.exec(worker, [task, stage])
				.then(nextTask => {
					// stage result in next stage
					console.log('result', nextTask)
					onUpdate({event: 'taskFinished', task, nextTask})
					next(null, nextTask)
				})
				.catch(error => {
					console.error('err', error)
					onUpdate({event: 'taskError', task, error})
					next(error)
				})
				// .then(() => {
				// 	pool.terminate()
				// })
		}

		q.drain(function() {
			console.log(`${name} stage - all queue items have been processed`)
			onUpdate('drain', {q, stages})
		})

		stages.push(stage)
	}

	function newTask(workItem) {
		let task = {
			id: ulid(),
			isTask: true,
			priority,
			progress: [],
			start: Date.now(),
			finish: null,
			workItem
		}

		tasks.push(task)

		return task
	}

	function progress(task, stage, event, msg) {
		let stg = task.progress[stage.index] || {}
		stg[event] = Date.now()
		task.progress[stage.index] = stg
	}


	function stageAt(stageIdx, task, customPriority) {
		stages[stageIdx].stage(task, customPriority)
	}

	function stage(task, customPriority) {
		stageAt(0, task, customPriority)
	}

	function checkpoint() {
		let checkpointJson = stages.map( ({stage, pool, q, ...rest}) => ({
			q: [...q],
			paused: q.paused,
			...rest
		}))

		saveCheckpoint?.(checkpointJson)
	}

	function restore() {
		loadCheckpoint?.(checkpoint => {
			console.log('loaded checkpoint', checkpoint)
		})
	}

	stageDefs.forEach?.(addStage)

	restore()

	let api = {
		stages,
		tasks,
		addStage,
		stage
	}

	return api
}
