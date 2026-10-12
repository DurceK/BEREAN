// Escolhe o cliente com que o app vai rodar ou ser gerado:
//   npm run cliente -- berean
// Copia clientes/<pasta>/.env (endereço e chave pública do Supabase daquele cliente)
// para o .env da raiz, junto com CLIENTE=<pasta>. Depois reinicie com `npx expo start -c`.
import { existsSync, readFileSync, writeFileSync } from 'fs';

const pasta = process.argv[2];
if (!pasta) {
  console.error('Diga qual cliente usar. Ex: npm run cliente -- berean');
  process.exit(1);
}
const origem = `clientes/${pasta}`;
if (!existsSync(`${origem}/cliente.json`)) {
  console.error(`Pasta ${origem} não existe ou não tem cliente.json.`);
  process.exit(1);
}
if (!existsSync(`${origem}/.env`)) {
  console.error(
    `Falta ${origem}/.env com EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.`
  );
  process.exit(1);
}

const variaveis = readFileSync(`${origem}/.env`, 'utf8');
writeFileSync(
  '.env',
  `# Gerado por npm run cliente; edite clientes/${pasta}/.env\nCLIENTE=${pasta}\n${variaveis}`
);
console.log(`Cliente "${pasta}" ativado. Reinicie com: npx expo start -c`);
