require('./Invites');
require('./Planets');
require('./Reports');
require('./Users');
require('./components/Pages');
require('./components/files/FileObjects');
require('./components/files/Files');
require('./components/forum/ForumPosts');
require('./components/forum/ForumReplies');
require('./components/forum/Forums');
require('./components/wiki/WikiPages');
require('./components/wiki/Wikis');
require('./Notifications');

import Loggers from '../Loggers';

Loggers.dbLogger.info("Database schemas loaded sucessfully");

export {};