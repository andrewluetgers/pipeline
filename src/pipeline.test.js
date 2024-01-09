
import pipeline from './pipeline.js'


describe('pipeline', () => {

	//test('can create a simple pipeline', () => {
	//	let p = pipeline(() => {
	//		console.log('update')
	//	})
	//
	//	expect(p).toBeTruthy()
	//
	//})
	
	it('should initialize with default values when no parameters are passed', () => {
		const pipelineInstance = pipeline();
		expect(pipelineInstance.stages).toEqual([]);
		// Further assertions for default state
	});
	
	it('should correctly initialize with provided stage definitions', () => {
		const stageDefs = [{
			name: 'some stage name',
			worker: (task, stage) => nextTask, // tasks must be json serializable
			concurrency: 1, // also sets number of workers in pool
			
			// execution engine adds
			//q: [task, ...], // priority queue of tasks // https://caolan.github.io/async/v3/docs.html#queue
			//pool: // pool instance requires exec and terminate methods
		}]
		const pipelineInstance = pipeline(stageDefs);
		expect(pipelineInstance.stages.length).toEqual(2);
		// Further assertions for stage configuration
	});
	//
	//it('should set up saveCheckpoint and loadCheckpoint functions correctly', () => {
	//	const mockSaveCheckpoint = jest.fn();
	//	const mockLoadCheckpoint = jest.fn();
	//	const pipelineInstance = pipeline([], mockSaveCheckpoint, mockLoadCheckpoint);
	//
	//	// Trigger save and load to test
	//	// Assertions to check if mock functions were called
	//});
	//
	//it('should integrate onUpdate callback correctly', () => {
	//	const mockOnUpdate = jest.fn();
	//	const pipelineInstance = pipeline([], null, null, mockOnUpdate);
	//
	//	// Perform actions that would trigger the onUpdate
	//	// Assertions to check if mockOnUpdate was called correctly
	//});
	//
	//it('should integrate onUpdate callback correctly', () => {
	//	const mockOnUpdate = jest.fn();
	//	const pipelineInstance = pipeline([], null, null, mockOnUpdate);
	//
	//	// Perform actions that would trigger the onUpdate
	//	// Assertions to check if mockOnUpdate was called correctly
	//});
	//
	//it('should handle invalid parameters gracefully', () => {
	//	expect(() => pipeline([], 'notAFunction')).toThrow();
	//	// Additional assertions for other invalid parameter scenarios
	//});
	
})
