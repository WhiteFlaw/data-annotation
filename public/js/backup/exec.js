class Exec {
    saveWorldUndo(editor, params) { // 撤回世界
        editor.change_anno(params.frame, params);
    }
    saveWorldRedo(editor, params) { // 恢复世界
        editor.change_anno(params.frame, params);
    }
    initialWorldUndo(editor, params) { // 回到初始状态
        console.log("Back To Initial World.")
        editor.change_anno(params.frame, params);
    }

}

export { Exec };