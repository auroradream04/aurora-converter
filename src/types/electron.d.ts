declare namespace Electron {
  interface MenuItemConstructorOptions {
    label?: string;
    click?: (menuItem: any, browserWindow: any, event: any) => void;
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio';
    role?: string;
    accelerator?: string;
    checked?: boolean;
    submenu?: MenuItemConstructorOptions[] | Menu;
    id?: string;
    enabled?: boolean;
    visible?: boolean;
  }
  
  interface OpenDialogReturnValue {
    canceled: boolean;
    filePaths: string[];
  }
}

declare namespace NodeJS {
  interface Process {
    resourcesPath: string;
  }
}

declare module 'electron-store' {
  interface Options<T> {
    name?: string;
    cwd?: string;
    defaults?: T;
    schema?: any;
    watch?: boolean;
    migrations?: any;
    clearInvalidConfig?: boolean;
    accessPropertiesByDotNotation?: boolean;
    encryptionKey?: string | Buffer;
    fileExtension?: string;
    serialize?: (value: T) => string;
    deserialize?: (text: string) => T;
    beforeEachMigration?: (store: any, context: any) => void | Promise<void>;
  }

  class Store<T = any> {
    constructor(options?: Options<T>);
    get<K extends keyof T>(key: K): T[K];
    get(key: string): any;
    set<K extends keyof T>(key: K, value: T[K]): void;
    set(key: string, value: any): void;
    set(object: Partial<T>): void;
    has<K extends keyof T>(key: K): boolean;
    has(key: string): boolean;
    delete<K extends keyof T>(key: K): void;
    delete(key: string): void;
    clear(): void;
    onDidChange<K extends keyof T>(key: K, callback: (newValue: T[K], oldValue: T[K]) => void): () => void;
    onDidChange(key: string, callback: (newValue: any, oldValue: any) => void): () => void;
    onDidAnyChange(callback: (newValue: T, oldValue: T) => void): () => void;
    size: number;
    store: T;
    path: string;
  }

  export = Store;
}

declare module 'ffmpeg-static' {
  const path: string;
  export = path;
} 