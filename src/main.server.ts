import { bootstrapApplication } from '@angular/platform-browser';
import { config } from './app/app.config.server';
import { AppComponent } from './app/app';

const bootstrap = () => bootstrapApplication(AppComponent, config);

export default bootstrap;