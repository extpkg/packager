# EXT packager utility

> ext-packager is a utility to package directories or zip files into EXT extensions.

## Install

```bash
npm install @extpkg/packager
```

## Generate a private key

```
ext-packager keygen [-k privateKeyFile] [-f]
```

Generate a new private key and save it to a file in `PKCS#8` PEM format. If the private key file is not specified, `private.pem` is used by default. To override any existing private key files use the `-f` option.

## Sign an extension

```
ext-packager pack <sourcePath> [-k privateKeyFile] [-o destFile] [-f]
```

Package and sign an extension with the specified private key. The source path can be a file or a directory. If the private key file is not specified, `private.pem` is used by default. If the destination file is not specified, the output file is created in the parent directory of the source path with the basename of the source path and `.ext` file extension. To override any existing destination files use the `-f` option.
