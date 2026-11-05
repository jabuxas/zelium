import "./database";
import { sequelize } from "./database/connection";
import { migrate } from "./database/migrate";
import { bootstrapPrimeiraOrganizacao } from "./database/bootstrap";
import { verificarContasDemo } from "./database/verificarContasDemo";
import app from "./app";

const PORT = process.env.PORT ?? 8000;

sequelize
  .authenticate()
  .then(() => migrate())
  .then(() => bootstrapPrimeiraOrganizacao())
  .then(() => verificarContasDemo())
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err: Error) => {
    console.error(`\n❌ ${err.message}\n`);
    process.exit(1);
  });
