#!/usr/bin/env node
import yargs from 'yargs'
import * as packager from './packager'

// Create args
const args = yargs(process.argv.slice(2))
args.scriptName('ext-packager')
args.epilogue('to show command help use $0 <command> --help')
args.demandCommand(1)
args.help('help')
args.completion()
args.strict()

// Key generation
args.command('keygen', 'generate a new signing key', (yargs) => {
  return yargs.option('key', {
    type: 'string',
    default: 'private.pem',
    demandOption: false,
    alias: 'k',
    describe: 'private key file',
  }).option('force', {
    type: 'boolean',
    default: false,
    demandOption: false,
    alias: 'f',
    describe: 'override any existing files',
  }).usage('$0 keygen [-k privateKeyFile] [-f]')
}, async args => {
  await packager.keygen({
    privateKeyFile: args.key,
    force: args.force,
  })
})

// Packaging
args.command('pack <src>', 'package and sign an extension', (yargs) => {
  return yargs.positional('src', {
    type: 'string',
    demandOption: true,
    describe: 'source directory or file',
  }).options('out', {
    type: 'string',
    default: undefined,
    alias: 'o',
    describe: 'destination file',
  }).option('key', {
    type: 'string',
    default: 'private.pem',
    demandOption: false,
    alias: 'k',
    describe: 'private key file',
  }).option('force', {
    type: 'boolean',
    default: false,
    demandOption: false,
    alias: 'f',
    describe: 'override any existing files',
  }).usage('$0 pack <sourcePath> [-k privateKeyFile] [-o destFile] [-f]')
}, async args => {
  await packager.pack({
    privateKeyFile: args.key,
    sourcePath: args.src,
    outFile: getOutFile(args.out, args.src),
    force: args.force,
  })
})

// Parse args
args.parse()

// Get output file from the source path
function getOutFile(out: string | undefined, src: string) {
  if (out !== undefined) {
    return out
  } else if (src.endsWith('.zip') && src.length > 4) {
    return src.substring(0, src.length - 4) + '.ext'
  } else {
    return src + '.ext'
  }
}
