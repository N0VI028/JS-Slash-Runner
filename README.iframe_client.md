# iframe_client Declaration File Generation

This project includes a configuration to generate a single TypeScript declaration file (`.d.ts`) for all TypeScript files in the `iframe_client` directory. The declaration file preserves JSDoc comments, making it useful for documentation and type checking.

## How to Generate the Declaration File

The declaration file is automatically generated when you build the project using:

```bash
npm run build
```

This will create a file at `dist/iframe_client.d.ts` containing type declarations for all TypeScript files in the `iframe_client` directory.

If you want to generate only the declaration file without building the entire project, you can use:

```bash
npm run build:dts
```

## Configuration Details

The declaration file generation is configured in `tsconfig.iframe_client.json`, which extends the main `tsconfig.json` but adds specific settings for declaration file generation:

- Outputs a single declaration file at `dist/iframe_client.d.ts`
- Preserves JSDoc comments in the declaration file
- Only includes TypeScript files from the `iframe_client` directory
- Strips internal declarations (marked with `@internal`)

## Using the Declaration File

The generated declaration file can be used for:

1. Documentation - The preserved JSDoc comments provide detailed information about types, functions, and parameters
2. Type checking - When importing from the iframe_client module
3. IDE autocompletion - Provides type information for better code completion

## Customizing the Configuration

If you need to modify the declaration file generation, you can edit the `tsconfig.iframe_client.json` file. Common customizations include:

- Changing the output file location
- Including or excluding specific files
- Modifying compiler options for declaration generation
