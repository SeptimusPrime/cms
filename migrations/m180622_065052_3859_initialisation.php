<?php

namespace craft\contentmigrations;

use Craft;
use craft\db\Migration;

/**
 * m180622_065052_3859_initialisation migration.
 */
class m180622_065052_3859_initialisation extends Migration
{
    /**
     * @inheritdoc
     */
    public function safeUp()
    {
        $databaseName = getenv('DB_DATABASE');
        echo "Re-creating database $databaseName";
        $this->execute("drop database $databaseName; create database $databaseName; use $databaseName;");

        $initialisationSQLPath = __DIR__ . '/sql/3859_initialisation.sql';
        echo "Initialising database based on $initialisationSQLPath";
        $initialisationSQL = file_get_contents($initialisationSQLPath);
        $this->execute($initialisationSQL);
    }

    /**
     * @inheritdoc
     */
    public function safeDown()
    {
        echo "m180622_065052_3859_initialisation cannot be reverted.\n";
        return false;
    }
}
