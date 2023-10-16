import crypto from 'crypto'
import archiver from 'archiver'
import path from 'path'
import fs from 'fs'
import os from 'os'

/** Key generation options. */
export interface KeygenOptions {
  /** File path to write the private key to. */
  privateKeyFile: string
  /** If the file path already exists, override it. */
  force?: boolean
}

/**
 * Generate a new private key for signing.
 * @param options Key generation options.
 */
export function keygenSync(options: KeygenOptions) {
  
  // Validate options
  const force = options.force === undefined ? false : options.force
  if (!force && fs.existsSync(options.privateKeyFile)) {
    throw new Error(`Private key file '${options.privateKeyFile}' already exists`)
  }
  
  // Generate key
  const key = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
  })

  // Export key
  fs.writeFileSync(options.privateKeyFile, key.privateKey)
  
}

/**
 * Generate a new private key for signing.
 * @param options Key generation options.
 */
export async function keygen(options: KeygenOptions) {

  // Validate options
  const force = options.force === undefined ? false : options.force
  if (!force && fs.existsSync(options.privateKeyFile)) {
    throw new Error(`Private key file '${options.privateKeyFile}' already exists`)
  }
 
  // Generate key
  const key = await new Promise<string>((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
      publicKeyEncoding: {
        type: 'pkcs1',
        format: 'pem',
      },
    }, (err, _publicKey, privateKey) => {
      if (err) {
        reject(err)
      } else {
        resolve(privateKey)
      }
    })
  })

  // Export key
  await fs.promises.writeFile(options.privateKeyFile, key)

}

/** Packaging options */
export interface PackOptions {
  /** File path to read the private key from. */
  privateKeyFile: string
  /** File or directory path to sign. */
  sourcePath: string
  /** Output file path to write the signed package to. */
  outFile: string
  /** If the output file path already exists, override it. */
  force?: boolean
}

/**
 * Sign and package an extension.
 * @param options Packaging options.
 */
export async function pack(options: PackOptions) {

  // Validate options
  const force = options.force === undefined ? false : options.force
  if (!fs.existsSync(options.privateKeyFile)) {
    throw new Error(`Private key file '${options.privateKeyFile}' does not exist`)
  } else if (!fs.existsSync(options.sourcePath)) {
    throw new Error(`Source path '${options.sourcePath}' does not exist`)
  } else if (!force && fs.existsSync(options.outFile)) {
    throw new Error(`Output file '${options.outFile}' already exists`)
  }

  // Import private key
  const pem = fs.readFileSync(options.privateKeyFile)
  const privateKey = crypto.createPrivateKey(pem)
  const publicKey = crypto.createPublicKey(privateKey)

  // Export public key
  const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' })
  const publicKeyLength = publicKeyDer.length

  // Read zip file
  let zip: Buffer | null = null
  const stat = await fs.promises.stat(options.sourcePath)
  if (stat.isDirectory()) {
    const tmp = await fs.promises.mkdtemp(os.tmpdir() + path.sep)
    try {
      const file = path.join(tmp, 'extension.zip')
      await createZip(options.sourcePath, file)
      zip = await fs.promises.readFile(file)
    } finally {
      await fs.promises.rm(tmp, { recursive: true })
    }
  } else if (stat.isFile()) {
    zip = await fs.promises.readFile(options.sourcePath)
  } else {
    throw new Error(`Source path '${options.sourcePath}' is not a directory or a file`)
  }

  // Create signature
  const sign = crypto.createSign('RSA-SHA1')
  sign.update(zip)
  sign.end()
  const signature = sign.sign(privateKey)
  const signatureLength = signature.length

  // Allocate output buffer
  const length = 16 + publicKeyLength + signatureLength + zip.length
  const buffer = Buffer.alloc(length)

  // Write to output buffer
  Buffer.from([0x45, 0x58, 0x54, 0x38]).copy(buffer, 0)
  Buffer.from([0x02, 0x00, 0x00, 0x00]).copy(buffer, 4)
  buffer.writeUint32LE(publicKeyLength, 8)
  buffer.writeUint32LE(signatureLength, 12)
  publicKeyDer.copy(buffer, 16)
  signature.copy(buffer, 16 + publicKeyLength)
  zip.copy(buffer, 16 + publicKeyLength + signatureLength)

  // Save to file
  await fs.promises.writeFile(options.outFile, buffer)
  
}

// Create a zip file
function createZip(src: string, dst: string) {
  return new Promise<void>((resolve, reject) => {

    // Open file
    let ok = true
    const output = fs.createWriteStream(dst)
    output.on('close', () => {
      if (ok) resolve()
    })

    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 }})
    archive.on('error', err => {
      ok = false
      reject(err)
    })
    archive.pipe(output)
    archive.directory(src, false)
    archive.finalize()

  })
}
