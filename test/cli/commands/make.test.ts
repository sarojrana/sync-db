import * as path from 'path';
import * as yaml from 'yamljs';
import { expect } from 'chai';
import { it, describe } from 'mocha';

import { runCli, queryByPattern } from './util';
import Configuration from '../../../src/domain/Configuration';
import { mkdir, mkdtemp, write, exists, glob, read } from '../../../src/util/fs';

describe('CLI: make', () => {
  describe('--help', () => {
    it('should print help message.', async () => {
      const { stdout } = await runCli(['make', '--help']);

      expect(stdout).contains('make');
      expect(stdout).contains(`USAGE\n  $ sync-db make`);
    });
  });

  it('should create migration directory automatically if it does not exist.', async () => {
    const cwd = await mkdtemp();
    await write(path.join(cwd, 'sync-db.yml'), yaml.stringify({}));

    await runCli(['make', 'something'], { cwd });

    // Directory is created.
    const pathExists = await exists(path.join(cwd, 'src/migration'));

    expect(pathExists).to.equal(true);
  });

  it('should create a migration file when name is supplied.', async () => {
    // Write sync-db.yml file.
    const cwd = await mkdtemp();
    const migrationPath = path.join(cwd, 'src/migration');
    await mkdir(migrationPath, { recursive: true });
    await write(
      path.join(cwd, 'sync-db.yml'),
      yaml.stringify({
        migration: {
          directory: 'migration'
        }
      } as Configuration)
    );

    const { stdout } = await runCli(['make', 'alter_users_table_drop_column'], { cwd });

    // Check the output.
    expect(stdout).to.match(/Created.+\d{13}_alter_users_table_drop_column\.up\.sql/);
    expect(stdout).to.match(/Created.+\d{13}_alter_users_table_drop_column\.down\.sql/);

    // Check files are created.
    const files = await glob(migrationPath);

    expect(files.length).to.equal(2);

    const upFile = await read(
      path.join(migrationPath, queryByPattern(files, /\d{13}_alter_users_table_drop_column\.up\.sql/))
    );
    const downFile = await read(
      path.join(migrationPath, queryByPattern(files, /\d{13}_alter_users_table_drop_column\.down\.sql/))
    );

    expect(upFile).to.equal('');
    expect(downFile).to.equal('');
  });

  it('should create a migration file with create table template when filename convention is followed.', async () => {
    const cwd = await mkdtemp();
    const migrationPath = path.join(cwd, 'src/migration');
    await write(path.join(cwd, 'sync-db.yml'), yaml.stringify({}));

    await runCli(['make', 'create_users_table'], { cwd });

    const files = await glob(migrationPath);

    expect(files.length).to.equal(2);

    const upFile = await read(path.join(migrationPath, queryByPattern(files, /\d{13}_create_users_table\.up\.sql/)));
    const downFile = await read(
      path.join(migrationPath, queryByPattern(files, /\d{13}_create_users_table\.down\.sql/))
    );

    expect(upFile).contains('CREATE TABLE users');
    expect(downFile).contains('DROP TABLE users');
  });
});