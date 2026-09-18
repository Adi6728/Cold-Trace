"""Create product, batch, shipment, event, custody, and organization tables.

Revision ID: 0003_step4_product_and_shipment_domains
Revises: 0002_create_users_table
Create Date: 2026-09-18 00:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0003_step4_product_shipment"
down_revision = "0002_create_users_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_organizations_id"), "organizations", ["id"], unique=False)
    op.create_index(op.f("ix_organizations_slug"), "organizations", ["slug"], unique=True)

    op.add_column("users", sa.Column("organization_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_users_organization_id"), "users", ["organization_id"], unique=False)
    op.create_foreign_key(
        "fk_users_organization_id_organizations",
        "users",
        "organizations",
        ["organization_id"],
        ["id"],
    )

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("manufacturer_id", sa.Integer(), nullable=False),
        sa.Column("storage_min_temp", sa.Float(), nullable=False),
        sa.Column("storage_max_temp", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["manufacturer_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_products_id"), "products", ["id"], unique=False)
    op.create_index(op.f("ix_products_manufacturer_id"), "products", ["manufacturer_id"], unique=False)

    op.create_table(
        "batches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("batch_number", sa.String(length=100), nullable=False),
        sa.Column("manufactured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expiry_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_batches_id"), "batches", ["id"], unique=False)
    op.create_index(op.f("ix_batches_product_id"), "batches", ["product_id"], unique=False)
    op.create_index(op.f("ix_batches_batch_number"), "batches", ["batch_number"], unique=False)
    op.create_index(op.f("ix_batches_status"), "batches", ["status"], unique=False)

    op.create_table(
        "shipments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=False),
        sa.Column("origin_organization_id", sa.Integer(), nullable=False),
        sa.Column("destination_organization_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expected_delivery_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["batch_id"], ["batches.id"]),
        sa.ForeignKeyConstraint(["origin_organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["destination_organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_shipments_id"), "shipments", ["id"], unique=False)
    op.create_index(op.f("ix_shipments_batch_id"), "shipments", ["batch_id"], unique=False)
    op.create_index(op.f("ix_shipments_origin_organization_id"), "shipments", ["origin_organization_id"], unique=False)
    op.create_index(op.f("ix_shipments_destination_organization_id"), "shipments", ["destination_organization_id"], unique=False)
    op.create_index(op.f("ix_shipments_status"), "shipments", ["status"], unique=False)

    op.create_table(
        "shipment_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("shipment_id", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_shipment_events_id"), "shipment_events", ["id"], unique=False)
    op.create_index(op.f("ix_shipment_events_shipment_id"), "shipment_events", ["shipment_id"], unique=False)
    op.create_index(op.f("ix_shipment_events_event_type"), "shipment_events", ["event_type"], unique=False)

    op.create_table(
        "custody_transfers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("shipment_id", sa.Integer(), nullable=False),
        sa.Column("from_organization_id", sa.Integer(), nullable=False),
        sa.Column("to_organization_id", sa.Integer(), nullable=False),
        sa.Column("transferred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"]),
        sa.ForeignKeyConstraint(["from_organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["to_organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_custody_transfers_id"), "custody_transfers", ["id"], unique=False)
    op.create_index(op.f("ix_custody_transfers_shipment_id"), "custody_transfers", ["shipment_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_custody_transfers_shipment_id"), table_name="custody_transfers")
    op.drop_index(op.f("ix_custody_transfers_id"), table_name="custody_transfers")
    op.drop_table("custody_transfers")

    op.drop_index(op.f("ix_shipment_events_event_type"), table_name="shipment_events")
    op.drop_index(op.f("ix_shipment_events_shipment_id"), table_name="shipment_events")
    op.drop_index(op.f("ix_shipment_events_id"), table_name="shipment_events")
    op.drop_table("shipment_events")

    op.drop_index(op.f("ix_shipments_status"), table_name="shipments")
    op.drop_index(op.f("ix_shipments_destination_organization_id"), table_name="shipments")
    op.drop_index(op.f("ix_shipments_origin_organization_id"), table_name="shipments")
    op.drop_index(op.f("ix_shipments_batch_id"), table_name="shipments")
    op.drop_index(op.f("ix_shipments_id"), table_name="shipments")
    op.drop_table("shipments")

    op.drop_index(op.f("ix_batches_status"), table_name="batches")
    op.drop_index(op.f("ix_batches_batch_number"), table_name="batches")
    op.drop_index(op.f("ix_batches_product_id"), table_name="batches")
    op.drop_index(op.f("ix_batches_id"), table_name="batches")
    op.drop_table("batches")

    op.drop_index(op.f("ix_products_manufacturer_id"), table_name="products")
    op.drop_index(op.f("ix_products_id"), table_name="products")
    op.drop_table("products")

    op.drop_constraint("fk_users_organization_id_organizations", "users", type_="foreignkey")
    op.drop_index(op.f("ix_users_organization_id"), table_name="users")
    op.drop_column("users", "organization_id")

    op.drop_index(op.f("ix_organizations_slug"), table_name="organizations")
    op.drop_index(op.f("ix_organizations_id"), table_name="organizations")
    op.drop_table("organizations")
