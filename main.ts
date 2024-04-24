import {
    App,
    Editor,
    MarkdownView,
    Modal,
    Notice,
    Plugin,
    PluginSettingTab,
    Setting,
} from "obsidian";
import MathQuill, { MathField } from "mathquill-node";

// Remember to rename these classes and interfaces!

interface MqSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: MqSettings = {
    mySetting: "t",
};

export default class MyPlugin extends Plugin {
    settings: MqSettings;

    async onload() {
        await this.loadSettings();

        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon(
            "dice",
            "Sample Plugin",
            (evt: MouseEvent) => {
                // Called when the user clicks the icon.
                new Notice("This is a notice!");
            },
        );
        // Perform additional things with the ribbon
        ribbonIconEl.addClass("my-plugin-ribbon-class");

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText("Status Bar Text");

        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: "open-mq-editor",
            name: "Open Mathquill Editor",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const cursor = editor.getCursor();
                const line = editor.getLine(cursor.line);
                let latexStart = -1;
                for (let i = cursor.ch; i >= 0; i--) {
                    if (line[i] == "$" && (i == 0 || line[i - 1] != "\\")) {
                        latexStart = i + 1;
                        break;
                    }
                }
                let latexEnd = -1;
                if (latexStart >= 0) {
                    for (let i = cursor.ch + 1; i < line.length; i++) {
                        if (line[i] == "$" && (i == 0 || line[i - 1] != "\\")) {
                            latexEnd = i;
                            break;
                        }
                    }
                }
                console.log(latexStart, latexEnd);
                let initialLatex = "";
                if (latexStart != -1 && latexEnd != -1) {
                    initialLatex = editor.getRange(
                        {
                            line: cursor.line,
                            ch: latexStart,
                        },
                        {
                            line: cursor.line,
                            ch: latexEnd,
                        },
                    );
                }
                new MqModal(this.app, initialLatex, (latex) => {
                    const hasInitialLatex = latexStart != -1 && latexEnd != -1;
                    if (!hasInitialLatex && latex.trim() == "") return;

                    if (hasInitialLatex) {
                        editor.replaceRange(
                            latex,
                            {
                                line: cursor.line,
                                ch: latexStart,
                            },
                            {
                                line: cursor.line,
                                ch: latexEnd,
                            },
                        );
                    } else {
                        editor.replaceSelection(`$${latex}$`);
                    }
                }).open();
            },
        });
        // This adds a complex command that can check whether the current state of the app allows execution of the command
        this.addCommand({
            id: "open-mq-editor-test",
            name: "Open Mathquill Editor (Testing)",
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView =
                    this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    // If checking is true, we're simply "checking" if the command can be run.
                    // If checking is false, then we want to actually perform the operation.
                    if (!checking) {
                        new MqModal(this.app, "1", console.log).open();
                    }

                    // This command will only show up in Command Palette when the check function returns true
                    return true;
                }
            },
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new MqSettingsTab(this.app, this));
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class MqModal extends Modal {
    initialLatex: string;
    onSubmit: (latex: string) => void;
    constructor(
        app: App,
        initialLatex: string,
        onSubmit: (latex: string) => void,
    ) {
        super(app);
        this.initialLatex = initialLatex;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        const mathBox = contentEl.createEl("div");
        mathBox.style.minWidth = "100%";
        const MQ = MathQuill.getInterface(2);

        const closeAndSubmit = (mf: MathField) => {
            this.close();
            this.onSubmit(mf.latex());
        };
        // const rawLatexArea = contentEl.createEl("textarea");
        // rawLatexArea.addClass("");
        const mathField = MQ.MathField(mathBox, {
            handlers: {
                enter: closeAndSubmit,
                // edit(mathField) {
                //     rawLatexArea.setText(mathField.latex());
                // },
            },
        });

        mathField.latex(this.initialLatex);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class MqSettingsTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("Setting #1")
            .setDesc("It's a secret")
            .addText((text) =>
                text
                    .setPlaceholder("Enter your secret")
                    .setValue(this.plugin.settings.mySetting)
                    .onChange(async (value) => {
                        this.plugin.settings.mySetting = value;
                        await this.plugin.saveSettings();
                    }),
            );
    }
}
