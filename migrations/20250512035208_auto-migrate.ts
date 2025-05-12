import { Knex } from 'knex'

// prettier-ignore
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('user'))) {
    await knex.schema.createTable('user', table => {
      table.increments('id')
      table.string('username', 32).notNullable()
      table.string('password', 255).notNullable()
      table.string('avatar', 50).nullable()
      table.string('email', 255).nullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('session'))) {
    await knex.schema.createTable('session', table => {
      table.increments('id')
      table.text('token').notNullable()
      table.integer('user_id').unsigned().notNullable().references('user.id')
      table.timestamps(false, true)
    })
  }
}

// prettier-ignore
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('session')
  await knex.schema.dropTableIfExists('user')
}
