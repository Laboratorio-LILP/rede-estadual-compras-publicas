#!/usr/bin/env node
/**
 * Guarda da regra do design system: nenhum valor hexadecimal de cor existe
 * fora do arquivo de tokens (`docs/specs/design-system.md`, secoes 1 e 5).
 *
 * A auditoria de 27/08 encontrou 268 cores escritas a mao no legado. A regra
 * existe para que isso nao volte a acontecer por acumulo silencioso.
 *
 * Roda dentro do conteiner, por `make lint` (ADR-008).
 */

import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ_DO_REPO = resolve(AQUI, "..", "..");

/** Onde procurar. Diretorio ausente e ignorado sem erro. */
const ALVOS = ["frontend/src", "backend/apps"];

/** O unico arquivo autorizado a conter hexadecimal. */
const ARQUIVO_DE_TOKENS = "frontend/src/estilos/tokens.css";

const EXTENSOES = new Set([".css", ".ts", ".tsx", ".js", ".jsx", ".html", ".svg"]);
const IGNORAR = new Set(["node_modules", "dist", "coverage", "__pycache__", "migrations"]);

const HEXADECIMAL = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z_-])/;

async function* arquivos(diretorio) {
  let entradas;
  try {
    entradas = await readdir(diretorio, { withFileTypes: true });
  } catch {
    return; // diretorio ausente: nada a verificar
  }
  for (const entrada of entradas) {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      if (!IGNORAR.has(entrada.name)) yield* arquivos(caminho);
    } else if (EXTENSOES.has(entrada.name.slice(entrada.name.lastIndexOf(".")))) {
      yield caminho;
    }
  }
}

const achados = [];

for (const alvo of ALVOS) {
  for await (const caminho of arquivos(resolve(RAIZ_DO_REPO, alvo))) {
    const relativo = relative(RAIZ_DO_REPO, caminho);
    if (relativo === ARQUIVO_DE_TOKENS) continue;

    const linhas = (await readFile(caminho, "utf8")).split("\n");
    linhas.forEach((linha, indice) => {
      const encontrado = HEXADECIMAL.exec(linha);
      if (encontrado) {
        achados.push(`${relativo}:${indice + 1}: ${encontrado[0]}  ->  ${linha.trim()}`);
      }
    });
  }
}

if (achados.length > 0) {
  console.error("Valor hexadecimal fora do arquivo de tokens:\n");
  for (const achado of achados) console.error(`  ${achado}`);
  console.error(
    `\nCor mora em ${ARQUIVO_DE_TOKENS} e se usa por var(--sp-*).` +
      "\nContrato: docs/specs/design-system.md, secao 1.",
  );
  process.exit(1);
}

console.log(`Tokens: nenhum hexadecimal fora de ${ARQUIVO_DE_TOKENS}.`);
