import axios from 'axios'
import * as jwt from 'jsonwebtoken'
import { spawn, ChildProcess, execSync } from 'child_process'

const BASE_URL = 'http://localhost:3000'

async function runTest() {
  let serverProcess: ChildProcess | null = null

  try {
    // 1. Build and Start Server
    console.log('Building and starting server...')
    execSync('npm run build --silent')
    serverProcess = spawn('node', ['dist/src/main.js'], { detached: true })

    await new Promise<void>((resolve, reject) => {
      serverProcess?.stdout?.on('data', (data) => {
        if (data.toString().includes('Nest application successfully started')) {
          console.log('Server started successfully.')
          resolve()
        }
      })
      serverProcess?.stderr?.on('data', (data) => {
        console.error(`Server stderr: ${data}`)
        reject(new Error('Server failed to start'))
      })
    })

    // 2. Create User
    const email = `testuser-${Date.now()}@stockplay.local`
    const password = 'password123'
    await axios.post(`${BASE_URL}/users/signup`, { email, password, displayName: 'E2E Test User' })
    console.log(`User ${email} created.`)

    // 3. Login and get User JWT
    const loginRes = await axios.post(`${BASE_URL}/users/login`, { email, password })
    const userJwt = loginRes.data.accessToken
    console.log('User JWT obtained.')

    // 4. Create Contest
    const startsAt = new Date()
    const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000)
    const contestPayload = {
      name: 'E2E Test Contest',
      slug: `e2e-test-${Date.now()}`,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      initial_balance_cents: 10000000,
      contest_type: 'PORTFOLIO',
    }
    const contestRes = await axios.post(`${BASE_URL}/contests`, contestPayload, { headers: { Authorization: `Bearer ${userJwt}` } })
    const contestId = contestRes.data.id
    console.log(`Contest created with ID: ${contestId}`)

    // 5. Join Contest
    await axios.post(`${BASE_URL}/contests/${contestId}/join`, {}, { headers: { Authorization: `Bearer ${userJwt}` } })
    console.log('User joined contest.')

    // 6. Buy Stock
    await axios.post(`${BASE_URL}/portfolio/${contestId}/add-stock`, { symbol: 'RELIANCE', quantity: 10 }, { headers: { Authorization: `Bearer ${userJwt}` } })
    console.log('Executed buy order for 10 RELIANCE.')

    // 7. Verify Portfolio
    const portfolioRes = await axios.get(`${BASE_URL}/portfolio/${contestId}/current`, { headers: { Authorization: `Bearer ${userJwt}` } })
    console.log('--- Current Portfolio State ---')
    console.log(portfolioRes.data)
    if (portfolioRes.data.positions.length !== 1 || portfolioRes.data.positions[0].symbol !== 'RELIANCE') {
      throw new Error('Portfolio verification failed!')
    }
    console.log('-----------------------------')

    // 8. Trigger EOD Workflow
    const adminJwt = jwt.sign({ sub: 'admin', role: 'admin' }, process.env.JWT_SECRET || 'devsecret')
    await axios.post(`${BASE_URL}/stocks/admin/sync-symbols`, { nseUrl: 'https://archives.nseindia.com/content/equities/EQUITY_L.csv' }, { headers: { Authorization: `Bearer ${adminJwt}` } })
    console.log('EOD workflow triggered. Waiting 10s for async jobs to complete...')
    await new Promise(resolve => setTimeout(resolve, 10000));


    // 9. Check Leaderboard
    const leaderboardRes = await axios.get(`${BASE_URL}/contests/${contestId}/leaderboard`)
    console.log('--- Final Leaderboard ---')
    console.log(leaderboardRes.data)
    if (leaderboardRes.data.length !== 1 || !leaderboardRes.data[0].portfolioValueCents) {
      throw new Error('Leaderboard verification failed!')
    }
    console.log('------------------------')

    console.log('✅ E2E Test Passed!')
  } catch (error: any) {
    console.error('❌ E2E Test Failed!')
    if (error.response) {
      console.error('Error Response:', error.response.data)
    } else {
      console.error(error.message)
    }
    process.exit(1)
  } finally {
    // Cleanup
    if (serverProcess && serverProcess.pid) {
      process.kill(-serverProcess.pid)
      console.log('Server stopped.')
    }
  }
}

runTest() 