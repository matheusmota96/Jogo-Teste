export function DbNotice() {
  return (
    <div className="notice">
      <strong>Banco de dados nao configurado.</strong>
      <p style={{ margin: "8px 0 0" }}>
        Para ver os dados, configure o Postgres:
      </p>
      <ol style={{ margin: "8px 0 0", paddingLeft: 18 }}>
        <li>
          Copie <code>.env.example</code> para <code>.env</code> e ajuste{" "}
          <code>DATABASE_URL</code>.
        </li>
        <li>
          Rode <code>npm run db:push</code> para criar as tabelas.
        </li>
        <li>
          Rode <code>npm run db:seed</code> para popular dados de exemplo.
        </li>
      </ol>
    </div>
  );
}
