
import { vector4to3, vector3_nomalize, psr_to_xyz, matmul, getDomInfo } from "./util.js"
import { globalObjectCategory } from './obj_cfg.js';
import { MovableView } from "./popup_dialog.js";
import { saveWorldList } from "./save.js";

function BoxImageContext(ui) {

    this.ui = ui;

    // draw highlighted box
    this.updateFocusedImageContext = function (box) {
        var scene_meta = box.world.frameInfo.sceneMeta;


        let bestImage = choose_best_camera_for_point(
            scene_meta,
            box.position);

        if (!bestImage) {
            return;
        }

        if (!scene_meta.calib.camera) {
            return;
        }

        var calib = scene_meta.calib.camera[bestImage]
        if (!calib) {
            return;
        }

        if (calib) {
            var img = box.world.cameras.getImageByName(bestImage);
            if (img && (img.naturalWidth > 0)) {

                this.clear_canvas();

                var imgfinal = box_to_2d_points(box, calib)

                if (imgfinal != null) {  // if projection is out of range of the image, stop drawing.
                    var ctx = this.ui.getContext("2d");
                    ctx.lineWidth = 0.5;

                    // note: 320*240 should be adjustable
                    var crop_area = crop_image(img.naturalWidth, img.naturalHeight, ctx.canvas.width, ctx.canvas.height, imgfinal);

                    ctx.drawImage(img, crop_area[0], crop_area[1], crop_area[2], crop_area[3], 0, 0, ctx.canvas.width, ctx.canvas.height);// ctx.canvas.clientHeight);
                    //ctx.drawImage(img, 0,0,img.naturalWidth, img.naturalHeight, 0, 0, 320, 180);// ctx.canvas.clientHeight);
                    var imgfinal = vectorsub(imgfinal, [crop_area[0], crop_area[1]]);
                    var trans_ratio = {
                        x: ctx.canvas.height / crop_area[3],
                        y: ctx.canvas.height / crop_area[3],
                    }

                    draw_box_on_image(ctx, box, imgfinal, trans_ratio, true);
                }
            }
        }
    }

    this.clear_canvas = function () {
        var c = this.ui;
        var ctx = c.getContext("2d");
        ctx.clearRect(0, 0, c.width, c.height);
    }


    function vectorsub(vs, v) {
        var ret = [];
        var vl = v.length;

        for (var i = 0; i < vs.length / vl; i++) {
            for (var j = 0; j < vl; j++)
                ret[i * vl + j] = vs[i * vl + j] - v[j];
        }

        return ret;
    }


    function crop_image(imgWidth, imgHeight, clientWidth, clientHeight, corners) {
        var maxx = 0, maxy = 0, minx = imgWidth, miny = imgHeight;

        for (var i = 0; i < corners.length / 2; i++) {
            var x = corners[i * 2];
            var y = corners[i * 2 + 1];

            if (x > maxx) maxx = x;
            else if (x < minx) minx = x;

            if (y > maxy) maxy = y;
            else if (y < miny) miny = y;
        }

        var targetWidth = (maxx - minx) * 1.5;
        var targetHeight = (maxy - miny) * 1.5;

        if (targetWidth / targetHeight > clientWidth / clientHeight) {
            //increate height
            targetHeight = targetWidth * clientHeight / clientWidth;
        }
        else {
            targetWidth = targetHeight * clientWidth / clientHeight;
        }

        var centerx = (maxx + minx) / 2;
        var centery = (maxy + miny) / 2;

        return [
            centerx - targetWidth / 2,
            centery - targetHeight / 2,
            targetWidth,
            targetHeight
        ];
    }

    function draw_box_on_image(ctx, box, box_corners, trans_ratio, selected) {
        var imgfinal = box_corners;

        if (!selected) {
            let target_color = null;
            if (box.world.data.cfg.color_obj == "category") {
                target_color = globalObjectCategory.get_color_by_category(box.obj_type);
            }
            else // by id
            {
                let idx = (box.obj_track_id) ? parseInt(box.obj_track_id) : box.obj_local_id;
                target_color = globalObjectCategory.get_color_by_id(idx);
            }

            //ctx.strokeStyle = get_obj_cfg_by_type(box.obj_type).color;

            //var c = get_obj_cfg_by_type(box.obj_type).color;
            var r = "0x" + (target_color.x * 256).toString(16);
            var g = "0x" + (target_color.y * 256).toString(16);;
            var b = "0x" + (target_color.z * 256).toString(16);;

            ctx.fillStyle = "rgba(" + parseInt(r) + "," + parseInt(g) + "," + parseInt(b) + ",0.2)";
        }
        else {
            ctx.strokeStyle = "#ff00ff";
            ctx.fillStyle = "rgba(255,0,255,0.2)";
        }

        // front panel
        ctx.beginPath();
        ctx.moveTo(imgfinal[3 * 2] * trans_ratio.x, imgfinal[3 * 2 + 1] * trans_ratio.y);

        for (var i = 0; i < imgfinal.length / 2 / 2; i++) {
            ctx.lineTo(imgfinal[i * 2 + 0] * trans_ratio.x, imgfinal[i * 2 + 1] * trans_ratio.y);
        }

        ctx.closePath();
        ctx.fill();

        // frame
        ctx.beginPath();

        ctx.moveTo(imgfinal[3 * 2] * trans_ratio.x, imgfinal[3 * 2 + 1] * trans_ratio.y);

        for (var i = 0; i < imgfinal.length / 2 / 2; i++) {
            ctx.lineTo(imgfinal[i * 2 + 0] * trans_ratio.x, imgfinal[i * 2 + 1] * trans_ratio.y);
        }
        //ctx.stroke();


        //ctx.strokeStyle="#ff00ff";
        //ctx.beginPath();

        ctx.moveTo(imgfinal[7 * 2] * trans_ratio.x, imgfinal[7 * 2 + 1] * trans_ratio.y);

        for (var i = 4; i < imgfinal.length / 2; i++) {
            ctx.lineTo(imgfinal[i * 2 + 0] * trans_ratio.x, imgfinal[i * 2 + 1] * trans_ratio.y);
        }

        ctx.moveTo(imgfinal[0 * 2] * trans_ratio.x, imgfinal[0 * 2 + 1] * trans_ratio.y);
        ctx.lineTo(imgfinal[4 * 2 + 0] * trans_ratio.x, imgfinal[4 * 2 + 1] * trans_ratio.y);
        ctx.moveTo(imgfinal[1 * 2] * trans_ratio.x, imgfinal[1 * 2 + 1] * trans_ratio.y);
        ctx.lineTo(imgfinal[5 * 2 + 0] * trans_ratio.x, imgfinal[5 * 2 + 1] * trans_ratio.y);
        ctx.moveTo(imgfinal[2 * 2] * trans_ratio.x, imgfinal[2 * 2 + 1] * trans_ratio.y);
        ctx.lineTo(imgfinal[6 * 2 + 0] * trans_ratio.x, imgfinal[6 * 2 + 1] * trans_ratio.y);
        ctx.moveTo(imgfinal[3 * 2] * trans_ratio.x, imgfinal[3 * 2 + 1] * trans_ratio.y);
        ctx.lineTo(imgfinal[7 * 2 + 0] * trans_ratio.x, imgfinal[7 * 2 + 1] * trans_ratio.y);


        ctx.stroke();
    }
}



class ImageContext extends MovableView {

    constructor(parentUi, name, autoSwitch, cfg, on_img_click) {

        // create ui
        let template = document.getElementById("image-wrapper-template");
        let tool = template.content.cloneNode(true);
        // this.boxEditorHeaderUi.appendChild(tool);
        // return this.boxEditorHeaderUi.lastElementChild;

        parentUi.appendChild(tool);
        let ui = parentUi.lastElementChild;
        let handle = ui.querySelector("#move-handle");
        super(handle, ui);

        this.ui = ui;
        this.cfg = cfg;
        this.on_img_click = on_img_click;
        this.autoSwitch = autoSwitch;
        this.setImageName(name);

    }

    remove() {
        this.ui.remove();
    }


    setImageName(name) {
        this.name = name;
        this.ui.querySelector("#header-title").innerText = (this.autoSwitch ? "auto-" : "") + name;
    }


    get_selected_box = null;

    isDrag = false; // 当前是否为拖拽(移动)模式
    start = false; // 当前是否正在拖放添加矩形
    startDom = null; // 当前正在添加(鼠标未弹起)的矩形id
    rectData = null; // 鼠标坐标, 数组[x, y]
    nowSel = null; // 当前选中的矩形
    topDot = null; // 拖拽模式下鼠标拖拽顶点的斜对顶点

    getRate() {
        const boardData = getDomInfo(document.querySelector('#image-board'));
        const rates = {
            rateX: 2048 / boardData.width,
            rateY: 1536 / boardData.height
        }
        return rates;
    }

    annotate_pic_init() { // 图片标注相关
        const svg = d3.select('#maincanvas-svg');
        const act = d3.select('#header-modify');
        act.text('调整');

        this.createDrag(); // 注册drag模式
        svg.on('mousemove', (e) => { this.annotate_pic_mouse_move(e) });
        svg.on('mousedown', (e) => { this.annotate_pic_mouse_down(e) });
        svg.on('mouseup', (e) => { this.annotate_pic_mouse_up(e) });
        act.on('click', () => { this.annotate_pic_finish() });

        // 初始化星标
        const positionXY = svg.append('g').attr('class', 'line-g');
        svg.append('g').attr('id', 'rect-g'); // 标注组
        positionXY.append('line').attr('id', 'line-x').attr('x1', 0).attr('y1', 0).attr('x2', 2048).attr('y2', 0).attr('stroke', 'white').attr('stroke-width', 0);
        positionXY.append('line').attr('id', 'line-y').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1536).attr('stroke', 'white').attr('stroke-width', 0);
        positionXY.append('circle').attr('id', 'line-circle').attr('cx', -10).attr('cy', -10).attr('r', 5).attr('fill', 'red');

        d3.select('#header-save').on('click', () => { this.annotate_pic_save() });
        // this.annotate_pic_reapply(); // 这个时刻没有world, 不能在此重应用, 必须在world生成并且annotation挂载到world之后
    }

    annotate_pic_id() {
        const id = document.querySelector('#header-id-list').value;
        d3.select(`#${this.nowSel}-rect`).attr(`obj_id`, id);
    }

    annotate_pic_clear() { // 切帧清除全部标注
        // 但是不能在这保存
        d3.selectAll('#rect-g > g').remove();
    }

    annotate_pic_reapply() {
        const data = this.world.annotation_2d;
        const container = d3.select('#rect-g');
        for (let i = 0; i < data.psr.length; i++) {
            container.append('g')
                .attr('id', data.psr[i].id.substring(0, data.psr[i].id.length - 5))
                .append('rect')
                .attr('id', data.psr[i].id)
                .attr('width', data.psr[i].width)
                .attr('height', data.psr[i].height)
                .attr('x', data.psr[i].x)
                .attr('y', data.psr[i].y)
                .attr('stroke', 'yellow')
                .attr('fill', 'yellow')
                .attr('fill-opacity', '0.1')
                .attr('obj_id', data.psr[i].obj_id)
        }
    }

    // 给新建的dom对象加obj_id属性, reapply也加
    // 存的时候得对ann做额外的处理, 加入2d数据
    annotate_pic_id_list() {
        const id_list = this.world.annotation.boxes.map((item) => item.obj_track_id).sort((a, b) => a - b)// .concat([]);
        let obj_list_str = id_list.reduce((prev, curr) => {
            return `${prev}<option>${curr}</option>`;
        }, '<option>unknown</option>');
        d3.select('#header-id-list').html(obj_list_str);
    }

    Drag = null; // Drag函数

    annotate_pic_finish() {
        const act = d3.select('#header-modify');
        const sta = d3.select('#header-state');
        const del = d3.select('#header-delete');
        const idList = d3.select('#header-id-list');
        if (!this.isDrag) {
            act.text('完成');
            sta.text('调整中...').style('color', '#ffffff');
            del.style('display', 'block').on('click', () => { this.annotate_pic_delete() });
            idList.style('display', 'block').on('change', () => { this.annotate_pic_id() });
        } else { // 进入完成
            act.text('调整');
            sta.text('');
            del.style('display', 'none')
            idList.style('display', 'none')
            d3.selectAll('#rect-g > g > circle').remove();
            d3.select(`#${this.nowSel}-rect`).attr('stroke', 'yellow');
        }
        this.isDrag = !this.isDrag;
    }

    annotate_pic_delete() {
        d3.select(`#${this.nowSel}`).remove();
    }

    annotate_pic_save() {
        const scene = document.querySelector('#scene-selector').value;
        const frame = document.querySelector('#frame-selector').value;
        const allRect = d3.selectAll("#rect-g > g > rect")._groups[0];
        const sta = d3.select('#header-state');
        const data = {
            scene: scene,
            frame: frame,
            obj_type: 'annotation_2d',
            psr: []
        }
        for (let i = 0; i < allRect.length; i++) {
            const obj_id = d3.select(allRect[i]).attr('obj_id');
            if (obj_id === null) {
                sta.text('驳回: 未知项.').style('color', 'red');
                return;
            } else {
                d3.selectAll('#rect-g > g > rect').attr('stroke', 'yellow');
                sta.text('保存成功.').style('color', '#ffffff');
            };
            const temObj = {
                id: allRect[i].id,
                y: allRect[i].y.animVal.value,
                x: allRect[i].x.animVal.value,
                width: allRect[i].width.animVal.value,
                height: allRect[i].height.animVal.value,
                obj_id: obj_id
            }
            data.psr.push(temObj);
        };
        // 先加入world, 然后在boxtoAnnotation取到之后加入ann
        this.world['annotation_2d'] = data; // annotation.js - toBoxAnnotations()
        saveWorldList([this.world]); // 调用boxtoAnnotation
        return data;
    }

    annotate_pic_mouse_down(e) {
        if (!this.isDrag) { // 不是在拖拽模式
            const that = this;
            const id = new Date().getTime() + ''; // 获取一个不重复的id,给矩形分配一个id

            const xy = [(+e.offsetX) * this.getRate().rateX, (+e.offsetY) * this.getRate().rateY]; // 获取鼠标按下的坐标

            d3.select('#rect-g').append('g').attr('id', `rect-g-${id}`).append('rect').attr('id', `rect-g-${id}-rect`).attr('x', xy[0]).attr('y', xy[1]).attr('stroke', 'yellow').attr('fill', 'yellow').attr('fill-opacity', 0.1)
                .on('mouseenter', function () {
                    if (that.isDrag) {
                        d3.select(this).attr('cursor', 'pointer'); // 改变鼠标指针样式
                        const ver = [(+d3.select(this).attr('x')), (+d3.select(this).attr('y'))]; // 顶点坐标
                        const wh = [(+d3.select(this).attr('width')), (+d3.select(this).attr('height'))]; // 矩形宽高
                        const dots = [ver, [ver[0] + wh[0], ver[1]], [ver[0] + wh[0], ver[1] + wh[1]], [ver[0], ver[1] + wh[1]]]; // 得到四个圆点
                        const id = d3.select(this)._groups[0][0].parentNode.id; // 矩形父容器的id

                        d3.select(`#${id}`).selectAll('circle').data(dots).enter().append('circle')
                            .attr('cx', d => d[0]).attr('cy', d => d[1]).attr('r', 8).attr('fill', 'yellow').attr('parent', id)
                            .on('mouseenter', function () {
                                that.Drag(d3.select(this));
                            })
                    }
                })
                .on('click', function () {
                    if (that.isDrag) {
                        d3.select(this).attr('stroke', 'red');
                        d3.select(`#${that.nowSel}-rect`).attr('stroke', 'yellow');
                        that.nowSel = d3.select(this).attr('id').substring(0, d3.select(this).attr('id').length - 5);
                        const obj_id = d3.select(this).attr('obj_id') === null ? `unknown` : d3.select(this).attr('obj_id')
                        document.querySelector('#header-id-list').value = obj_id;
                    }
                })
            /* d3.select(`#rect-g-${id}-rect`).on('mouseleave', function () { // 直接在退出模式时全部去除即可, 此为单个去除
                if (!that.isDrag) {
                    const ver = [(+d3.select(this).attr('x')), (+d3.select(this).attr('y'))];
                    const wh = [(+d3.select(this).attr('width')), (+d3.select(this).attr('height'))];
                    const dots = [ver, [ver[0] + wh[0], ver[1]], [ver[0] + wh[0], ver[1] + wh[1]], [ver[0], ver[1] + wh[1]]];
                    const id = d3.select(this)._groups[0][0].parentNode.id; // 矩形父容器的id
                    console.log(d3.select(`#${id}`).selectAll('circle').data(dots).enter());
                    d3.select(`#${id}`).selectAll('circle').remove();
                }
            }) */
            this.rectData = xy; // 鼠标按下坐标
            this.start = true; // 开始添加绘制矩形
            this.startDom = `rect-g-${id}-rect`; // 当前矩形id
        }
    }

    annotate_pic_mouse_move(e) {
        if (!this.isDrag) {
            const xy = [(+e.offsetX), (+e.offsetY)];
            const xy0 = xy[0] * this.getRate().rateX;
            const xy1 = xy[1] * this.getRate().rateY;

            // 更新星标
            d3.select('#line-x').attr('x1', 0).attr('y1', xy1).attr('x2', 2048).attr('y2', xy1).attr('stroke', 'white').attr('stroke-width', 2);
            d3.select('#line-y').attr('x1', xy0).attr('y1', 0).attr('x2', xy0).attr('y2', 1536).attr('stroke', 'white').attr('stroke-width', 2);
            d3.select('#line-circle').attr('cx', xy0).attr('r', 10).attr('cy', xy1).attr('fill', 'red');

            if (this.start) {
                let top
                if (xy0 >= this.rectData[0]) { // 判断当前矩形顶点坐标
                    if (xy1 >= this.rectData[1]) {
                        top = this.rectData; // 右下
                    } else {
                        top = [this.rectData[0], xy1]; // 右上
                    }
                } else {
                    if (xy1 >= this.rectData[1]) {
                        top = [xy0, this.rectData[1]]; // 左下
                    } else {
                        top = xy; // 左上
                    }
                }
                // 动态修改矩形的属性值startDom是在mousedown中记录的矩形的id
                d3.select(`#${this.startDom}`)
                    .attr('x', top[0])
                    .attr('y', top[1])
                    .attr('width', Math.abs(this.rectData[0] - xy0))
                    .attr('height', Math.abs(xy1 - this.rectData[1]));
            }
        }
    }

    annotate_pic_mouse_up() {
        if (!this.isDrag) {
            this.start = false; // 添加矩形动作取消
            this.startDom = '';
            this.rectData = [];
        }
    }

    createDrag() {
        let color, widget;
        const that = this;
        this.Drag = d3.drag()
            .on('start', function () {
                color = d3.select(this).attr('fill');
                widget = d3.select(this).attr('fill', 'lime');
                const id = widget._groups[0][0].parentNode.id; // 获取父元素id
                if (widget._groups[0][0].localName === 'circle') {
                    // 获取矩形信息
                    const cxy = [
                        (+d3.select(`#${id}-rect`).attr('x')),
                        (+d3.select(`#${id}-rect`).attr('y')),
                        (+d3.select(`#${id}-rect`).attr('width')),
                        (+d3.select(`#${id}-rect`).attr('height'))
                    ];
                    const dot = [
                        (+d3.select(this).attr('cx')),
                        (+d3.select(this).attr('cy'))
                    ];
                    // 判断拖拽点对角的那个顶点
                    if (dot[0] > cxy[0]) {
                        if (dot[1] > cxy[1]) {
                            this.topDot = [cxy[0], cxy[1]] // 右下
                        } else {
                            this.topDot = [cxy[0], cxy[1] + cxy[3]] // 右上
                        }
                    } else {
                        if (dot[1] > cxy[1]) {
                            this.topDot = [dot[0] + cxy[2], cxy[1]] // 左下
                        } else {
                            this.topDot = [cxy[0] + cxy[2], cxy[1] + cxy[3]] // 左上
                        }
                    }
                }
            })
            .on('drag', function (e) {
                const dot = [
                    (+e.sourceEvent.offsetX) * that.getRate().rateX,
                    (+e.sourceEvent.offsetY) * that.getRate().rateY
                ] // 获取点坐标
                if (widget._groups[0][0].localName === 'circle') {
                    // 判断新点相对于旧点的信息, 获取新点坐标
                    let top
                    if (dot[0] >= this.topDot[0]) {
                        if (dot[1] >= this.topDot[1]) {
                            top = this.topDot; // 右下
                        } else {
                            top = [this.topDot[0], dot[1]]; // 右上
                        }
                    } else {
                        if (dot[1] >= this.topDot[1]) {
                            top = [dot[0], this.topDot[1]]; // 左下
                        } else {
                            top = dot; // 左上
                        }
                    }
                    const id = widget.attr('parent'); // 获取父元素的id
                    // 更新矩形数据
                    d3.select(`#${id}-rect`).attr('x', top[0]).attr('y', top[1])
                        .attr('width', Math.abs(this.topDot[0] - dot[0])).attr('height', Math.abs(dot[1] - this.topDot[1]));

                    d3.select(`#${id}`).selectAll('circle').remove(); // 移除顶点特效
                    const rect = d3.select(`#${id}-rect`);
                    const circles = [ // 获取四个顶点坐标
                        [(+rect.attr('x')), (+rect.attr('y'))],
                        [(+rect.attr('x')), (+rect.attr('y')) + (+rect.attr('height'))],
                        [(+rect.attr('x')) + (+rect.attr('width')), (+rect.attr('y'))],
                        [(+rect.attr('x')) + (+rect.attr('width')), (+rect.attr('y')) + (+rect.attr('height'))]
                    ];
                    d3.select(`#${id}`).selectAll('circle').data(circles).enter().append('circle')
                        .attr('cx', d => d[0]).attr('cy', d => d[1]).attr('r', 10).attr('fill', 'yellow').attr('parent', id)
                        .on('mouseenter', function () {
                            that.Drag(d3.select(this));
                        })
                }
            })
            .on('end', function () {
                widget.attr('fill', color);
                widget = null;
            })
    }

    init_image_op(func_get_selected_box) {
        this.annotate_pic_init(); // 初始化绘制
        this.get_selected_box = func_get_selected_box;
    }

    clear_main_canvas() {

        var boxes = this.ui.querySelector("#svg-boxes").children;

        if (boxes.length > 0) {
            for (var c = boxes.length - 1; c >= 0; c--) {
                boxes[c].remove();
            }
        }

        var points = this.ui.querySelector("#svg-points").children;

        if (points.length > 0) {
            for (var c = points.length - 1; c >= 0; c--) {
                points[c].remove();
            }
        }
    }

    world = null;
    img = null;

    attachWorld(world) {
        this.world = world;
        this.annotate_pic_reapply();
        this.annotate_pic_id_list();
    };

    hide() {
        this.ui.style.display = "none";
    };

    hidden() {
        this.ui.style.display == "none";
    };

    show() {
        this.ui.style.display = "";
    };



    drawing = false;
    points = [];
    polyline;

    all_lines = [];

    img_lidar_point_map = {};

    point_color_by_distance(x, y) {
        // x,y are image coordinates
        let p = this.img_lidar_point_map[y * this.img.width + x];

        let distance = Math.sqrt(p[1] * p[1] + p[2] * p[2] + p[3] * p[3]);

        if (distance > 60.0)
            distance = 60.0;
        else if (distance < 10.0)
            distance = 10.0;

        return [(distance - 10) / 50.0, 1 - (distance - 10) / 50.0, 0].map(c => {
            let hex = Math.floor(c * 255).toString(16);
            if (hex.length == 1)
                hex = "0" + hex;
            return hex;
        }).reduce((a, b) => a + b, "#");

    }

    to_polyline_attr(points) {
        return points.reduce(function (x, y) {
            return String(x) + "," + y;
        }
        )
    }

    to_viewbox_coord(x, y) {
        var div = this.ui.querySelector("#maincanvas-svg");

        x = Math.round(x * 2048 / div.clientWidth);
        y = Math.round(y * 1536 / div.clientHeight);
        return [x, y];

    }

    /* on_click(e){
        var p= this.to_viewbox_coord(e.layerX, e.layerY);
        var x=p[0];
        var y=p[1];
        
        console.log("clicked",x,y);

        
        if (!this.drawing){

            if (e.ctrlKey){
                this.drawing = true;
                var svg = this.ui.querySelector("#maincanvas-svg");
                //svg.style.position = "absolute";
                
                this.polyline = document.createElementNS("http://www.w3.org/2000/svg", 'polyline');
                svg.appendChild(this.polyline);
                this.points.push(x);
                this.points.push(y);

                
                this.polyline.setAttribute("class", "maincanvas-line")
                this.polyline.setAttribute("points", this.to_polyline_attr(this.points));

                var c = this.ui;
                c.onmousemove = on_move;
                c.ondblclick = on_dblclick;   
                c.onkeydown = on_key;    
            
            }
            else{
                // not drawing
                //this is a test
                if (false){
                    let nearest_x = 100000;
                    let nearest_y = 100000;
                    let selected_pts = [];
                    
                    for (let i =x-100; i<x+100; i++){
                        if (i < 0 || i >= this.img.width)
                            continue;

                        for (let j = y-100; j<y+100; j++){
                            if (j < 0 || j >= this.img.height)
                                continue;

                            let lidarpoint = this.img_lidar_point_map[j*this.img.width+i];
                            if (lidarpoint){
                                //console.log(i,j, lidarpoint);
                                selected_pts.push(lidarpoint); //index of lidar point

                                if (((i-x) * (i-x) + (j-y)*(j-y)) < ((nearest_x-x)*(nearest_x-x) + (nearest_y-y)*(nearest_y-y))){
                                    nearest_x = i;
                                    nearest_y = j;                                
                                }
                            }
                                
                        }
                    }
                    console.log("nearest", nearest_x, nearest_y);
                    this.draw_point(nearest_x, nearest_y);
                    if (nearest_x < 100000)
                    {
                        this.on_img_click([this.img_lidar_point_map[nearest_y*this.img.width+nearest_x][0]]);
                    }
                }
                
            }

        } else {
            if (this.points[this.points.length-2]!=x || this.points[this.points.length-1]!=y){
                this.points.push(x);
                this.points.push(y);
                this.polyline.setAttribute("points", this.to_polyline_attr(this.points));
            }
            
        }

        function on_move(e){

            var p = to_viewbox_coord(e.layerX, e.layerY);
            var x = p[0];
            var y = p[1];

            console.log(x,y);
            this.polyline.setAttribute("points", this.to_polyline_attr(this.points) + ',' + x + ',' + y);
        }

        function on_dblclick(e){
            
            this.points.push(this.points[0]);
            this.points.push(this.points[1]);
            
            this.polyline.setAttribute("points", this.to_polyline_attr(this.points));
            console.log(this.points)
            
            all_lines.push(this.points);

            this.drawing = false;
            this.points = [];

            var c = this.ui;
            c.onmousemove = null;
            c.ondblclick = null;
            c.onkeypress = null;
            c.blur();
        }

        function cancel(){
                
                polyline.remove();

                this.drawing = false;
                this.points = [];
                var c = this.ui;
                c.onmousemove = null;
                c.ondblclick = null;
                c.onkeypress = null;

                c.blur();
        }

        function on_key(e){
            if (e.key == "Escape"){
                cancel();
                
            }
        }
    } */


    // all boxes



    getCalib() {
        var scene_meta = this.world.sceneMeta;

        if (!scene_meta.calib.camera) {
            return null;
        }

        //var active_camera_name = this.world.cameras.active_name;
        var calib = scene_meta.calib.camera[this.name];

        return calib;
    }




    get_trans_ratio() {
        var img = this.world.cameras.getImageByName(this.name);

        if (!img || img.width == 0) {
            return null;
        }

        var clientWidth, clientHeight;

        clientWidth = 2048;
        clientHeight = 1536;

        var trans_ratio = {
            x: clientWidth / img.naturalWidth,
            y: clientHeight / img.naturalHeight,
        };

        return trans_ratio;
    }

    show_image() {
        var svgimage = this.ui.querySelector("#svg-image");

        // active img is set by global, it's not set sometimes.
        var img = this.world.cameras.getImageByName(this.name);
        if (img) {
            svgimage.setAttribute("xlink:href", img.src);
        }

        this.img = img;


    }


    points_to_svg(points, trans_ratio, cssclass, radius = 2) {
        var ptsFinal = points.map(function (x, i) {
            if (i % 2 == 0) {
                return Math.round(x * trans_ratio.x);
            } else {
                return Math.round(x * trans_ratio.y);
            }
        });

        var svg = document.createElementNS("http://www.w3.org/2000/svg", 'g');

        if (cssclass) {
            svg.setAttribute("class", cssclass);
        }

        for (let i = 0; i < ptsFinal.length; i += 2) {


            let x = ptsFinal[i];
            let y = ptsFinal[i + 1];

            let p = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
            p.setAttribute("cx", x);
            p.setAttribute("cy", y);
            p.setAttribute("r", 2);
            p.setAttribute("stroke-width", "1");

            if (!cssclass) {
                let image_x = points[i];
                let image_y = points[i + 1];
                let color = point_color_by_distance(image_x, image_y);
                color += "24"; //transparency
                p.setAttribute("stroke", color);
                p.setAttribute("fill", color);
            }

            svg.appendChild(p);
        }

        return svg;
    }

    draw_point(x, y) {
        let trans_ratio = this.get_trans_ratio();
        let svg = this.ui.querySelector("#svg-points");
        let pts_svg = this.points_to_svg([x, y], trans_ratio, "radar-points");
        svg.appendChild(pts_svg);
    };




    render_2d_image() {


        if (this.cfg.disableMainImageContext)
            return;
        this.clear_main_canvas();

        this.show_image();
        this.draw_svg();
    }


    hide_canvas() {
        //document.getElementsByClassName("ui-wrapper")[0].style.display="none";
        this.ui.style.display = "none";
    }

    show_canvas() {
        this.ui.style.display = "inline";
    }


    draw_svg() {
        // draw picture
        var img = this.world.cameras.getImageByName(this.name);

        if (!img || img.width == 0) {
            this.hide_canvas();
            return;
        }

        this.show_canvas();

        var trans_ratio = this.get_trans_ratio();

        var calib = this.getCalib();
        if (!calib) {
            return;
        }

        let svg = this.ui.querySelector("#svg-boxes");

        // draw boxes
        this.world.annotation.boxes.forEach((box) => {
            var imgfinal = box_to_2d_points(box, calib);
            if (imgfinal) {
                var box_svg = this.box_to_svg(box, imgfinal, trans_ratio, this.get_selected_box() == box);
                svg.appendChild(box_svg);
            }

        });

        svg = this.ui.querySelector("#svg-points");

        // draw radar points
        if (this.cfg.projectRadarToImage) {
            this.world.radars.radarList.forEach(radar => {
                let pts = radar.get_unoffset_radar_points();
                let ptsOnImg = points3d_to_image2d(pts, calib);

                // there may be none after projecting
                if (ptsOnImg && ptsOnImg.length > 0) {
                    let pts_svg = this.points_to_svg(ptsOnImg, trans_ratio, radar.cssStyleSelector);
                    svg.appendChild(pts_svg);
                }
            });
        }



        // project lidar points onto camera image   
        if (this.cfg.projectLidarToImage) {
            let pts = this.world.lidar.get_all_points();
            let ptsOnImg = points3d_to_image2d(pts, calib, true, this.img_lidar_point_map, img.width, img.height);

            // there may be none after projecting
            if (ptsOnImg && ptsOnImg.length > 0) {
                let pts_svg = this.points_to_svg(ptsOnImg, trans_ratio);
                svg.appendChild(pts_svg);
            }
        }

    }

    box_to_svg(box, box_corners, trans_ratio, selected) {


        var imgfinal = box_corners.map(function (x, i) {
            if (i % 2 == 0) {
                return Math.round(x * trans_ratio.x);
            } else {
                return Math.round(x * trans_ratio.y);
            }
        })


        var svg = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        svg.setAttribute("id", "svg-box-local-" + box.obj_local_id);

        if (selected) {
            svg.setAttribute("class", box.obj_type + " box-svg box-svg-selected");
        } else {
            if (box.world.data.cfg.color_obj == "id") {
                svg.setAttribute("class", "color-" + box.obj_track_id % 33);
            }
            else // by id
            {
                svg.setAttribute("class", box.obj_type + " box-svg");
            }
        }


        var front_panel = document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
        svg.appendChild(front_panel);
        front_panel.setAttribute("points",
            imgfinal.slice(0, 4 * 2).reduce(function (x, y) {
                return String(x) + "," + y;
            })
        )

        /*
        var back_panel =  document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
        svg.appendChild(back_panel);
        back_panel.setAttribute("points",
            imgfinal.slice(4*2).reduce(function(x,y){            
                return String(x)+","+y;
            })
        )
        */

        for (var i = 0; i < 4; ++i) {
            var line = document.createElementNS("http://www.w3.org/2000/svg", 'line');
            svg.appendChild(line);
            line.setAttribute("x1", imgfinal[(4 + i) * 2]);
            line.setAttribute("y1", imgfinal[(4 + i) * 2 + 1]);
            line.setAttribute("x2", imgfinal[(4 + (i + 1) % 4) * 2]);
            line.setAttribute("y2", imgfinal[(4 + (i + 1) % 4) * 2 + 1]);
        }


        for (var i = 0; i < 4; ++i) {
            var line = document.createElementNS("http://www.w3.org/2000/svg", 'line');
            svg.appendChild(line);
            line.setAttribute("x1", imgfinal[i * 2]);
            line.setAttribute("y1", imgfinal[i * 2 + 1]);
            line.setAttribute("x2", imgfinal[(i + 4) * 2]);
            line.setAttribute("y2", imgfinal[(i + 4) * 2 + 1]);
        }

        return svg;
    }


    boxes_manager = {
        display_image: () => {
            if (!this.cfg.disableMainImageContext)
                this.render_2d_image();
        },

        add_box: (box) => {
            var calib = this.getCalib();
            if (!calib) {
                return;
            }
            var trans_ratio = this.get_trans_ratio();
            if (trans_ratio) {
                var imgfinal = box_to_2d_points(box, calib);
                if (imgfinal) {
                    var imgfinal = imgfinal.map(function (x, i) {
                        if (i % 2 == 0) {
                            return Math.round(x * trans_ratio.x);
                        } else {
                            return Math.round(x * trans_ratio.y);
                        }
                    })

                    var svg_box = this.box_to_svg(box, imgfinal, trans_ratio);
                    var svg = this.ui.querySelector("#svg-boxes");
                    svg.appendChild(svg_box);
                }
            }
        },


        onBoxSelected: (box_obj_local_id, obj_type) => {
            var b = this.ui.querySelector("#svg-box-local-" + box_obj_local_id);
            if (b) {
                b.setAttribute("class", "box-svg-selected");
            }
        },


        onBoxUnselected: (box_obj_local_id, obj_type) => {
            var b = this.ui.querySelector("#svg-box-local-" + box_obj_local_id);

            if (b)
                b.setAttribute("class", obj_type);
        },

        remove_box: (box_obj_local_id) => {
            var b = this.ui.querySelector("#svg-box-local-" + box_obj_local_id);

            if (b)
                b.remove();
        },

        update_obj_type: (box_obj_local_id, obj_type) => {
            this.onBoxSelected(box_obj_local_id, obj_type);
        },

        update_box: (box) => {
            var b = this.ui.querySelector("#svg-box-local-" + box.obj_local_id);
            if (!b) {
                return;
            }

            var children = b.childNodes;

            var calib = this.getCalib();
            if (!calib) {
                return;
            }

            var trans_ratio = this.get_trans_ratio();
            var imgfinal = box_to_2d_points(box, calib);

            if (!imgfinal) {
                //box may go out of image
                return;
            }
            var imgfinal = imgfinal.map(function (x, i) {
                if (i % 2 == 0) {
                    return Math.round(x * trans_ratio.x);
                } else {
                    return Math.round(x * trans_ratio.y);
                }
            })

            if (imgfinal) {
                var front_panel = children[0];
                front_panel.setAttribute("points",
                    imgfinal.slice(0, 4 * 2).reduce(function (x, y) {
                        return String(x) + "," + y;
                    })
                )



                for (var i = 0; i < 4; ++i) {
                    var line = children[1 + i];
                    line.setAttribute("x1", imgfinal[(4 + i) * 2]);
                    line.setAttribute("y1", imgfinal[(4 + i) * 2 + 1]);
                    line.setAttribute("x2", imgfinal[(4 + (i + 1) % 4) * 2]);
                    line.setAttribute("y2", imgfinal[(4 + (i + 1) % 4) * 2 + 1]);
                }


                for (var i = 0; i < 4; ++i) {
                    var line = children[5 + i];
                    line.setAttribute("x1", imgfinal[i * 2]);
                    line.setAttribute("y1", imgfinal[i * 2 + 1]);
                    line.setAttribute("x2", imgfinal[(i + 4) * 2]);
                    line.setAttribute("y2", imgfinal[(i + 4) * 2 + 1]);
                }
            }

        }
    }

}


class ImageContextManager {
    constructor(parentUi, selectorUi, cfg, on_img_click) {
        this.parentUi = parentUi;
        this.selectorUi = selectorUi;
        this.cfg = cfg;
        this.on_img_click = on_img_click;

        this.addImage("", true);


        this.selectorUi.onmouseenter = function (event) {
            if (this.timerId) {
                clearTimeout(this.timerId);
                this.timerId = null;
            }

            event.target.querySelector("#camera-list").style.display = "";

        };


        this.selectorUi.onmouseleave = function (event) {
            let ui = event.target.querySelector("#camera-list");

            this.timerId = setTimeout(() => {
                ui.style.display = "none";
                this.timerId = null;
            },
                200);

        };

        this.selectorUi.querySelector("#camera-list").onclick = (event) => {
            let cameraName = event.target.innerText;

            if (cameraName == "auto") {

                let existed = this.images.find(x => x.autoSwitch);

                if (existed) {
                    this.removeImage(existed);
                }
                else {
                    this.addImage("", true);
                }

            }
            else {
                let existed = this.images.find(x => !x.autoSwitch && x.name == cameraName);

                if (existed) {
                    this.removeImage(existed);

                }
                else {
                    this.addImage(cameraName);
                }
            }
        };

    }

    updateCameraList(cameras) {

        let autoCamera = '<div class="camera-item" id="camera-item-auto">auto</div>';

        if (this.images.find(i => i.autoSwitch)) {
            autoCamera = '<div class="camera-item camera-selected" id="camera-item-auto">auto</div>';
        }

        let camera_selector_str = cameras.map(c => {

            let existed = this.images.find(i => i.name == c && !i.autoSwitch);
            let className = existed ? "camera-item camera-selected" : "camera-item";

            return `<div class="${className}" id="camera-item-${c}">${c}</div>`;
        }).reduce((x, y) => x + y, autoCamera);

        let ui = this.selectorUi.querySelector("#camera-list");
        ui.innerHTML = camera_selector_str;
        ui.style.display = "none";

        this.setDefaultBestCamera(cameras[0]);
    }

    setDefaultBestCamera(c) {

        if (!this.bestCamera) {
            let existed = this.images.find(x => x.autoSwitch);
            if (existed) {
                existed.setImageName(c);
            }

            this.bestCamera = c;
        }
    }

    images = [];
    addImage(name, autoSwitch) {

        if (autoSwitch && this.bestCamera && !name)
            name = this.bestCamera;

        let image = new ImageContext(this.parentUi, name, autoSwitch, this.cfg, this.on_img_click);

        this.images.push(image);

        if (this.init_image_op_para) {
            image.init_image_op(this.init_image_op_para);
        }

        if (this.world) {
            image.attachWorld(this.world);
            image.render_2d_image();
        }


        let selectorName = autoSwitch ? "auto" : name;

        let ui = this.selectorUi.querySelector("#camera-item-" + selectorName);
        if (ui)
            ui.className = "camera-item camera-selected";


        return image;
    }

    removeImage(image) {

        let selectorName = image.autoSwitch ? "auto" : image.name;
        this.selectorUi.querySelector("#camera-item-" + selectorName).className = "camera-item";
        this.images = this.images.filter(x => x != image);
        image.remove();


    }

    setBestCamera(camera) {
        this.images.filter(i => i.autoSwitch).forEach(i => {
            i.setImageName(camera);
            i.boxes_manager.display_image();
        });

        this.bestCamera = camera;
    }

    render_2d_image() {
        this.images.forEach(i => i.render_2d_image());
    }

    attachWorld(world) {

        this.world = world;
        this.images.forEach(i => i.attachWorld(world));
    }

    hide() {
        this.images.forEach(i => i.hide());
    }


    show() {
        this.images.forEach(i => i.show());
    }

    clear_main_canvas() {
        this.images.forEach(i => i.clear_main_canvas());
    }

    init_image_op(op) {
        this.init_image_op_para = op;
        this.images.forEach(i => i.init_image_op(op));
    }
    hidden() {
        return false;
    }

    choose_best_camera_for_point = choose_best_camera_for_point;

    self = this;

    boxes_manager = {

        display_image: () => {
            if (!this.cfg.disableMainImageContext)
                this.render_2d_image();
        },

        add_box: (box) => {
            this.images.forEach(i => i.boxes_manager.add_box(box));
        },


        onBoxSelected: (box_obj_local_id, obj_type) => {
            this.images.forEach(i => i.boxes_manager.onBoxSelected(box_obj_local_id, obj_type));
        },


        onBoxUnselected: (box_obj_local_id, obj_type) => {
            this.images.forEach(i => i.boxes_manager.onBoxUnselected(box_obj_local_id, obj_type));
        },

        remove_box: (box_obj_local_id) => {
            this.images.forEach(i => i.boxes_manager.remove_box(box_obj_local_id));
        },

        update_obj_type: (box_obj_local_id, obj_type) => {
            this.images.forEach(i => i.boxes_manager.update_obj_type(box_obj_local_id, obj_type));
        },

        update_box: (box) => {
            this.images.forEach(i => i.boxes_manager.update_box(box));
        }
    }


}

function box_to_2d_points(box, calib) {
    var scale = box.scale;
    var pos = box.position;
    var rotation = box.rotation;

    var box3d = psr_to_xyz(pos, scale, rotation);

    //console.log(box.obj_track_id, box3d.slice(8*4));

    box3d = box3d.slice(0, 8 * 4);
    return points3d_homo_to_image2d(box3d, calib);
}

// points3d is length 4 row vector, homogeneous coordinates
// returns 2d row vectors
function points3d_homo_to_image2d(points3d, calib, accept_partial = false, save_map, img_dx, img_dy) {
    var imgpos = matmul(calib.extrinsic, points3d, 4);

    //rect matrix shall be applied here, for kitti
    if (calib.rect) {
        imgpos = matmul(calib.rect, imgpos, 4);
    }

    var imgpos3 = vector4to3(imgpos);

    var imgpos2;
    if (calib.intrinsic.length > 9) {
        imgpos2 = matmul(calib.intrinsic, imgpos, 4);
    }
    else
        imgpos2 = matmul(calib.intrinsic, imgpos3, 3);

    let imgfinal = vector3_nomalize(imgpos2);
    let imgfinal_filterd = [];

    if (accept_partial) {
        let temppos = [];
        let p = imgpos3;
        for (var i = 0; i < p.length / 3; i++) {
            if (p[i * 3 + 2] > 0) {
                let x = imgfinal[i * 2];
                let y = imgfinal[i * 2 + 1];

                x = Math.round(x);
                y = Math.round(y);
                if (x > 0 && x < img_dx && y > 0 && y < img_dy) {
                    if (save_map) {
                        save_map[img_dx * y + x] = [i, points3d[i * 4 + 0], points3d[i * 4 + 1], points3d[i * 4 + 2]];  //save index? a little dangerous! //[points3d[i*4+0], points3d[i*4+1], points3d[i*4+2]];
                    }

                    imgfinal_filterd.push(x);
                    imgfinal_filterd.push(y);

                }
                else {
                    // console.log("points outside of image",x,y);
                }

            }
        }

        imgfinal = imgfinal_filterd;
        //warning: what if calib.intrinsic.length
        //todo: this function need clearance
        //imgpos2 = matmul(calib.intrinsic, temppos, 3);
    }
    else if (!accept_partial && !all_points_in_image_range(imgpos3)) {
        return null;
    }

    return imgfinal;
}

function point3d_to_homo(points) {
    let homo = [];
    for (let i = 0; i < points.length; i += 3) {
        homo.push(points[i]);
        homo.push(points[i + 1]);
        homo.push(points[i + 2]);
        homo.push(1);
    }

    return homo;
}
function points3d_to_image2d(points, calib, accept_partial = false, save_map, img_dx, img_dy) {
    // 
    return points3d_homo_to_image2d(point3d_to_homo(points), calib, accept_partial, save_map, img_dx, img_dy);
}

function all_points_in_image_range(p) {
    for (var i = 0; i < p.length / 3; i++) {
        if (p[i * 3 + 2] < 0) {
            return false;
        }
    }

    return true;
}


function choose_best_camera_for_point(scene_meta, center) {

    if (!scene_meta.calib) {
        return null;
    }

    var proj_pos = [];
    for (var i in scene_meta.calib.camera) {
        var imgpos = matmul(scene_meta.calib.camera[i].extrinsic, [center.x, center.y, center.z, 1], 4);
        proj_pos.push({ calib: i, pos: vector4to3(imgpos) });
    }

    var valid_proj_pos = proj_pos.filter(function (p) {
        return all_points_in_image_range(p.pos);
    });

    valid_proj_pos.forEach(function (p) {
        p.dist_to_center = p.pos[0] * p.pos[0] + p.pos[1] * p.pos[1];
    });

    valid_proj_pos.sort(function (x, y) {
        return x.dist_to_center - y.dist_to_center;
    });

    //console.log(valid_proj_pos);

    if (valid_proj_pos.length > 0) {
        return valid_proj_pos[0].calib;
    }

    return null;

}


export { ImageContextManager, BoxImageContext };
