# Database implementation (TODO)

`database/schema.sql` is a **PostgreSQL reference schema**, not an operational ORM.

When backend development starts, introduce SQLAlchemy models, Alembic migrations and a transaction-aware repository/service layer. Do **not** write production database rows through frontend `localStorage`. Establish backend-enforced ownership and authentication.
