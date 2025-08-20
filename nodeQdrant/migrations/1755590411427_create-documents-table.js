/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('documents', {
    doc_id: 'id',
    source_type: { type: 'varchar(50)', notNull: true },
    source_uri: { type: 'varchar(200)', notNull: true, unique: true },
    title:  { type: 'varchar(150)', notNull: true },
    lang:  { type: 'varchar(30)', notNull: true, default: "eng" },
    tags:  { type: 'text[]' },
    created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp' },
    version: { type: 'varchar(15)', default: "0.0.1", unique: true},
  });
};

exports.down = (pgm) => {
  pgm.dropTable('documents');
};
