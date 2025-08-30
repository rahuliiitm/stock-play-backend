import { GrowwAPI } from 'growwapi'

describe('GrowwAPI Simple Test', () => {
  it('should instantiate GrowwAPI', () => {
    const groww = new GrowwAPI()
    expect(groww).toBeDefined()
    expect(groww.liveData).toBeDefined()
    expect(groww.historicData).toBeDefined()
    expect(groww.holdings).toBeDefined()
    expect(groww.orders).toBeDefined()
  })

  it('should have required modules', () => {
    const groww = new GrowwAPI()
    
    // Check if all required modules are available
    expect(groww.liveData).toBeDefined()
    expect(groww.historicData).toBeDefined()
    expect(groww.holdings).toBeDefined()
    expect(groww.positions).toBeDefined()
    expect(groww.margins).toBeDefined()
    expect(groww.orders).toBeDefined()
    expect(groww.liveFeed).toBeDefined()
  })
})
