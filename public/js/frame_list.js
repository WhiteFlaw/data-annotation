const FrameManager = function (parentUi, data, onFrameChanged, toPreviousFrame, toNextFrame, toCertainFrame) {
    let template = document.getElementById("frame-manager-ui-template");
    let frameList = template.content.cloneNode(true);
    parentUi.appendChild(frameList);

    this.data = data;
    this.frame = null;
    this.frameIndex = null; // 保持frameIndex是数字
    this.eventList = []; // 操作队列

    this.onFrameChanged = onFrameChanged;
    this.toPreviousFrame = toPreviousFrame;
    this.toNextFrame = toNextFrame;
    this.toCertainFrame = toCertainFrame;

    this.ui = parentUi.lastElementChild;
    this.frameManagerListUi = this.ui.querySelector('#frame-manager-list');
    this.frameManagerIndexUi = this.ui.querySelector('#frame-manager-index');
    this.frameManagerPreviousUi = this.ui.querySelector('#frame-manager-previous');
    this.frameManagerNextUi = this.ui.querySelector('#frame-manager-next');
    

    this.frameManagerListUi.onclick = (e) => {
        this.onFrameChanged(e);
        this.after_frame_click(e);
    };

    this.frameManagerPreviousUi.onclick = () => {
        this.toPreviousFrame();
        this.after_previous();
    }

    this.frameManagerNextUi.onclick = () => {
        this.toNextFrame();
        this.after_next();
    }

    this.frameManagerIndexUi.onblur = () => {
        var frameIndex = this.frameManagerIndexUi.value;
        this.toCertainFrame(this.frameManagerIndexUi.value);
        this.after_certain(frameIndex);
    }

    this.after_frame_click = function (e) {
        this.frameManagerIndexUi.value = e.target.innerHTML;
        this.frameIndex = Number(e.target.innerHTML);
        this.update_event_list(this.frameIndex);
        this.update_frame_list();
    }

    this.after_certain = function (frameIndex) {
        this.frameIndex = frameIndex;
        this.update_event_list(this.frameIndex);
        this.update_frame_list();
    }

    this.after_previous = function () {
        if (this.frameIndex === 1) return;
        this.frameIndex -= 1;
        this.frameManagerIndexUi.value = this.frameIndex;
        this.update_event_list(this.frameIndex);
        this.update_frame_list();
    }

    this.after_next = function () {
        if (this.frameIndex > this.data.worldList.length - 1) return;
        this.frameIndex += 1;
        this.frameManagerIndexUi.value = this.frameIndex;
        this.update_event_list(this.frameIndex);
        this.update_frame_list();
    }

    this.update_frame_list = function () {
        let target = null;
        if(this.eventList.length === 1) {
            target = this.frameManagerListUi.querySelector(`#frame-list-${this.eventList[0]}`)
        } else {
            this.frameManagerListUi.querySelector(`#frame-list-${this.eventList[0]}`).classList.remove('frame-manager-choosen', true);
            target = this.frameManagerListUi.querySelector(`#frame-list-${this.eventList[1]}`)
        }
        target.classList.toggle('frame-manager-choosen', true);
        this.frame = target.getAttribute('value');
    }

    this.update_event_list = function(frameIndex) {
        this.eventList.push(frameIndex);
        if (this.eventList.length > 2) {
            this.eventList.shift();
        }
    }

    this.getFrameIndex = function(frame) {
        const frames = this.data.getMetaBySceneName(this.scene).frames;
        const frameIndex = frames.findIndex(f => f === frame);
        return frameIndex + 1;
    }

    this.set_frame_info = function(scene, frame) {
        this.frame = frame;
        this.scene = scene;
        this.frameIndex = this.getFrameIndex(frame);
        this.frameManagerIndexUi.value = this.frameIndex;
        this.update_event_list(this.frameIndex);
        this.update_frame_list();
    }
}

export { FrameManager };