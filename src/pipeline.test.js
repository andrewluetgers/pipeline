
import pipeline from '../pipeline'


describe('pipeline', () => {

	test('can create a simple pipeline', () => {

		let p = pipeline(() => {
			console.log('update')
		})

		expect(p).toBeTruthy()

	})

})
