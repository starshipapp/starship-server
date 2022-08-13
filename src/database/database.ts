// Require all of the database schemas so they are known to 
// mongoose.
// This uses require() because we do not need to use the models
// and unused imports generate a warning
require('./Invites');
require('./Planets');
require('./Reports');
require('./Users');
require('./CustomEmojis');
require('./Attachments');
require('./ReadReceipts');
require('./Tokens');
require('./Notifications');
require('./components/Pages');
require('./components/files/FileObjects');
require('./components/files/Files');
require('./components/forum/ForumPosts');
require('./components/forum/ForumReplies');
require('./components/forum/Forums');
require('./components/wiki/WikiPages');
require('./components/wiki/Wikis');
require('./components/chat/Chats');
require('./components/chat/Channels');
require('./components/chat/Messages');

import Loggers from '../Loggers';

Loggers.dbLogger.info("Database schemas loaded sucessfully");

export {};
