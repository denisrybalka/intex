import {
  Plugin,
  PluginManager as IPluginManager,
  HookMap,
} from "../types/plugins";

/**
 * The PluginManager is responsible for registering, unregistering, and executing plugins.
 * It provides methods to register plugins and execute hooks on all registered plugins.
 */
export class PluginManager implements IPluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private static instance: PluginManager;

  /**
   * Get the singleton instance of the PluginManager
   */
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  private constructor() {}

  /**
   * Register a plugin with the manager
   * @param plugin The plugin to register
   */
  public registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID ${plugin.id} is already registered`);
    }

    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Unregister a plugin from the manager
   * @param pluginId The ID of the plugin to unregister
   * @returns true if the plugin was found and unregistered, false otherwise
   */
  public unregisterPlugin(pluginId: string): boolean {
    return this.plugins.delete(pluginId);
  }

  /**
   * Get a plugin by its ID
   * @param pluginId The ID of the plugin to get
   * @returns The plugin with the specified ID, or undefined if not found
   */
  public getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   * @returns An array of all registered plugins
   */
  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Initialize all registered plugins
   */
  public async initialize(): Promise<void> {
    // Sort plugins by priority (higher first) and dependencies
    const sortedPlugins = this.getSortedPlugins();

    for (const plugin of sortedPlugins) {
      try {
        await plugin.initialize();
      } catch (error) {
        console.error(`Error initializing plugin ${plugin.id}:`, error);
      }
    }
  }

  /**
   * Shutdown all registered plugins
   */
  public async shutdown(): Promise<void> {
    // Shutdown in reverse order of initialization
    const sortedPlugins = this.getSortedPlugins().reverse();

    for (const plugin of sortedPlugins) {
      try {
        await plugin.shutdown();
      } catch (error) {
        console.error(`Error shutting down plugin ${plugin.id}:`, error);
      }
    }
  }

  /**
   * Execute a specific hook on all registered plugins
   * @param hookName The name of the hook to execute
   * @param args The arguments to pass to the hook
   */
  public async executeHook<T extends keyof HookMap>(
    hookName: T,
    ...args: Parameters<HookMap[T]>
  ): Promise<void> {
    const sortedPlugins = this.getSortedPlugins();

    for (const plugin of sortedPlugins) {
      const hookFunction = plugin[hookName];

      if (typeof hookFunction === "function") {
        try {
          // Call the hook function with the plugin as 'this' and pass args
          await (hookFunction as Function).call(plugin, ...args);
        } catch (error) {
          console.error(
            `Error executing ${String(hookName)} on plugin ${plugin.id}:`,
            error
          );

          // Call onError if it exists
          if (hookName !== "onError" && plugin.onError) {
            try {
              // For context-based hooks, pass the context to onError if available
              const context =
                args.length > 0 && "conversationId" in args[0]
                  ? args[0]
                  : undefined;
              await plugin.onError(error as Error, context);
            } catch (errorHandlingError) {
              console.error(
                `Error handling error in plugin ${plugin.id}:`,
                errorHandlingError
              );
            }
          }
        }
      }
    }
  }

  /**
   * Get plugins sorted by priority and dependencies
   * @returns Sorted array of plugins
   */
  private getSortedPlugins(): Plugin[] {
    const plugins = Array.from(this.plugins.values());

    // Create a dependency graph
    const dependencyGraph = new Map<string, string[]>();
    plugins.forEach((plugin) => {
      dependencyGraph.set(plugin.id, plugin.dependencies || []);
    });

    // Topological sort
    const sorted: Plugin[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    const visit = (pluginId: string): void => {
      if (temp.has(pluginId)) {
        throw new Error(`Circular dependency detected in plugins: ${pluginId}`);
      }
      if (visited.has(pluginId)) return;

      temp.add(pluginId);

      const dependencies = dependencyGraph.get(pluginId) || [];
      dependencies.forEach((depId) => {
        visit(depId);
      });

      temp.delete(pluginId);
      visited.add(pluginId);

      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        sorted.push(plugin);
      }
    };

    // Visit each plugin
    plugins.forEach((plugin) => {
      if (!visited.has(plugin.id)) {
        visit(plugin.id);
      }
    });

    // Sort by priority (higher first)
    return sorted.sort((a, b) => {
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      return priorityB - priorityA;
    });
  }
}
