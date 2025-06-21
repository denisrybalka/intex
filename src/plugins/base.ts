import { BasePlugin } from "../types/plugins";

export abstract class Plugin implements BasePlugin {
  id: string;
  name: string;
  description: string;

  constructor(config: { id: string; name: string; description: string }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
  }

  abstract initialize(): Promise<void>;
  abstract shutdown(): Promise<void>;
}
