/* eslint-disable @typescript-eslint/no-floating-promises */
import FileObjects from './components/files/Files';
import Planets from './Planets';

// TODO: Make this work
FileObjects.createIndexes([{name: "text"}]);
Planets.createIndexes([{name: "text", description: "text"}]);