/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('chunks', {
    chunk_id: 'id', // primary key
    doc_id: {
      type: 'integer',
      notNull: true,
      references: '"documents"',
      onDelete: 'cascade',
    },
    chunk_index: { type: 'integer', notNull: true }, // order of chunk in doc
    text: { type: 'text', notNull: true },
    tokens: { type: 'integer' }, // optional: number of tokens in chunk
    hash: { type: 'varchar(64)' }, // for dedup/version control
    is_active: { type: 'boolean', notNull: true, default: true },
    embedding_version: { type: 'varchar(15)', default: "0.0.1" },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp' },
  });

  // Optional index for faster lookups
  pgm.createIndex('chunks', ['doc_id', 'chunk_index']);
};

exports.down = (pgm) => {
  pgm.dropTable('chunks');
};
