const axios = require('axios')
const fs = require('fs')
const { ethers } = require('ethers')

// const PROVER_PUBLIC_KEY = '0x0bc40f93dd3193e65024ae9bb4e7fad4578b3dec'
const CALLER_PUBLIC_KEY = '0xE3B4934A2413DE6Cb26a050361121d983d8D42cc'

const CHALLENGE_ID = '437'

async function preLogin(proofType = 'pob') {
  const preloginBody = {
    publicKey: CALLER_PUBLIC_KEY,
    walletPublicKey: {
      ethereum: CALLER_PUBLIC_KEY
    },
    keyType: 'ethereum',
    role: 'payer',
    claims: {
      downlink_bandwidth: '10',
      uplink_bandwidth: '10'
    }
  }

  // Pre-login
  console.log('Pre-login...')
  const preloginResponse = await axios.post(
    `https://api.witnesschain.com/proof/v1/pob/pre-login`,
    preloginBody
  )

  // Get the message
  const message = preloginResponse.data.result.message
  console.log({ result: message })

  // Get the cookies
  const preloginCookies = preloginResponse.headers['set-cookie'].filter(
    (cookie) => cookie.startsWith('__Secure-proof')
  )
  //   console.log({ preloginCookies })

  return { message, preloginCookies }
}

async function triggerChallenge(proofType = 'pob') {
  const privateKey = fs.readFileSync('key', 'utf8').trim()

  const { message, preloginCookies } = await preLogin(proofType)

  // Sign the message using ethers
  const wallet = new ethers.Wallet(privateKey)
  console.log({ wallet: wallet.address })

  // Create the message hash and sign it properly
  const signature = await wallet.signMessage(message)
  console.log({ signature })

  const loginBody = {
    signature
  }

  // Login
  console.log('Login...')
  const loginResponse = await axios.post(
    `https://api.witnesschain.com/proof/v1/downlink/login`,
    loginBody,
    {
      headers: {
        Cookie: preloginCookies
      }
    }
  )
  console.log('LOGIN', loginResponse.data)

  // get cookies
  const loginCookies = loginResponse.headers['set-cookie']
  //   console.log({ loginCookies })

  // Trigger challenge
  console.log('Trigger challenge...')
  const challengeResponse = await axios.post(
    `https://api.witnesschain.com/proof/v1/downlink/challenge-request-dcl`,
    { challenge_id: CHALLENGE_ID },
    { headers: { Cookie: loginCookies.join(';') } }
  )
  console.log('CHALLENGE', challengeResponse.data)
}

// Execute the function
triggerChallenge().catch((error) =>
  console.error(error.response?.data || error)
)
