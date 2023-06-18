CREATE TABLE `highscores`
(
    `id`               varchar(36) PRIMARY KEY NOT NULL,
    `public_id`        varchar(36)             NOT NULL,
    `name`             varchar(256)            NOT NULL,
    `time_to_complete` smallint                NOT NULL,
    `created_at`       datetime(6)             NOT NULL,
    `updated_at`       datetime(6)             NOT NULL
);
