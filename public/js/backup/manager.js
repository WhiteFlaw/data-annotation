import { Exec } from './exec.js';

const executors = new Exec();

class BackupManager {
    constructor() {
        this.editor = null;
        
        this.doCount = 0;
        this.doActions = [];

        this.undoCount = 0;
        this.undoActions = [];
        
        this.justUndo = false;
        this.justRedo = false;
        
        this.nowFrame = null;
    }
    do(action) {
        if (this.justUndo || this.justRedo) { // undo/redo后, world不应立即入栈
            this.justUndo === true && (this.justUndo = false);
            this.justRedo === true && (this.justRedo = false);
            return;
        }

        this.previousWorld = action.params;
        this.doActions.push(action);
        this.doCount++
        console.log("Do: UnderCountrol: ", this.doActions);
    }
    /* getUndoShouldBe() { // 直接返回应当的状态, 用于本模块外的测试
        if (this.doActions.length <= 2) {
            console.log(`Cannot undo: doSatck length: ${this.doActions.length}.`);
            return;
        }
        const nowAction = this.doActions.pop();
        this.doCount--;
        this.undoActions.push(nowAction);
        this.undoCount++;

        const previousAction = this.peek('do');
        this.justUndo = true; // 应当调用saveWorldList以配合justUndo
        console.log("now Stack: ", this.doActions);
        return previousAction;
    } */
    undo() {
        if (this.doActions.length === 1) {
            console.log(`You Are Now In The Initial World.`);
            return;
        }
        const nowAction = this.doActions.pop();
        this.doCount--;
        this.undoActions.push(nowAction);
        this.undoCount++;

        const previousAction = this.peek('do');
        const executor = this.getFunction(`${previousAction.name}Undo`);
        executor(this.editor, previousAction.params)
        this.justUndo = true;
        console.log("Undo: UnderCountrol: ", this.doActions);
    }
    redo() {
        if (this.undoActions.length === 0) {
            console.log(`Connot Redo: RedoStack Length: 0.`);
            return;
        }
        const nowAction = this.undoActions.pop();
        this.undoCount--;
        this.doActions.push(nowAction);
        this.doCount++;

        const previousAction = nowAction;
        const executor = this.getFunction(`${previousAction.name}Redo`);
        executor(this.editor, previousAction.params);
        this.justRedo = true;
        console.log("Redo: UnderCountrol: ", this.doActions);
    }
    getFunction(name) {
        return executors[name];
    }
    peek(which) {
        if (which === 'do' || which === undefined) {
            return this.doActions[this.doCount];
        } else if (which === 'undo') {
            return this.undoAction[this.undoCount];
        }
    }
    length() {
        if (which === 'do' || which === undefined) {
            return this.doCount;
        } else if (which === 'undo') {
            return this.undoCount;
        }
    }
    reset() {
        this.doCount = 0;
        this.doActions = [];
        this.undoCount = 0;
        this.undoActions = [];
    }
    initEditor(editor) { // main.js--start()
        this.editor = editor;
    }
    initManager(action) { // data.js--_doPreload(), 切帧后应reset;
        const frame = this.editor.frameManager.frame;
        if (frame === this.nowFrame) return;
        this.nowFrame = frame;
        this.reset();
        this.doActions.push(action);
    }
}

const backupManager = new BackupManager();

export { backupManager }