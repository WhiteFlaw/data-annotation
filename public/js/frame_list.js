var FrameManager = function (parentUi, data, onFrameChanged, toPreviousFrame, toNextFrame, toCertainFrame) {
    let template = document.getElementById("frame-manager-ui-template");
    let frameList = template.content.cloneNode(true);
    parentUi.appendChild(frameList);

    this.data = data;
    this.frameIndex = null; // 保持frameIndex是数字, 省下很多麻烦
    this.eventList = []; // 双端队列, 最大2, 记录上次操作

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
        console.log(this.frameManagerIndexUi.value) // ???
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
        if(this.eventList.length === 1) {
            this.frameManagerListUi.querySelector(`#frame-list-${this.eventList[0]}`).classList.toggle('frame-manager-choosen', true);
        } else {
            this.frameManagerListUi.querySelector(`#frame-list-${this.eventList[0]}`).classList.remove('frame-manager-choosen', true);
            this.frameManagerListUi.querySelector(`#frame-list-${this.eventList[1]}`).classList.toggle('frame-manager-choosen', true);
        }
    }

    this.update_event_list = function(frameIndex) {
        this.eventList.push(frameIndex);
        if (this.eventList.length > 2) {
            this.eventList.shift();
        }
    }
}

export { FrameManager };