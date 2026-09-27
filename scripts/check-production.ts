/**
 * Verifica as variáveis de ambiente de PRODUÇÃO antes de publicar.
 * Uso: npm run check:prod   (lê o ambiente atual e, se existir, .env.production)
 */
import { config } from "dotenv";
import { checkProductionEnv } from "../src/lib/production-check";

config({ path: ".env.production", override: false, quiet: true });
const results = checkProductionEnv(process.env);
const icon = { OK: "✔", AVISO: "!", ERRO: "✖" } as const;
for (const r of results) console.log(`${icon[r.level]} ${r.level.padEnd(5)} ${r.key}: ${r.message}`);
const errors = results.filter((r) => r.level === "ERRO").length;
console.log(errors ? `\n${errors} erro(s): corrija antes de publicar.` : "\nConfiguração de produção sem erros.");
process.exit(errors ? 1 : 0);
