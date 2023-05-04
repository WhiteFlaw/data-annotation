
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

class ImageContext/*  extends MovableView  */{ // image-wrapper

    constructor(parentUi) {
        // create ui
        let template = document.getElementById("image-wrapper-template");
        let tool = template.content.cloneNode(true);
        parentUi.appendChild(tool);

        let ui = parentUi.lastElementChild;
        this.ui = ui;

        // let handle = ui.querySelector("#move-handle");
        // super(handle, ui);
    }

    world = null;
    name = 'front';

    init_image_op() {
        this.imageEditor = new ImageEditor();
        this.imageEditor.annotate_pic_init();
    }

    setBestCamera(name) {
        this.name = name;
        this.update_image();
    }

    attachWorld(world) {
        this.world = world;
        this.imageEditor.attachWorld(world);
    }

    update_image() {
        var svgimage = this.ui.querySelector("#svg-image");

        // active img is set by global, it's not set sometimes.
        var img = this.world.cameras.getImageByName(this.name);

        if (img) {
            svgimage.setAttribute("href", img.src);
        }

        this.img = img;

        if (this.world !== null) {
            this.imageEditor.annotate_pic_clear();
            this.imageEditor.annotate_pic_reapply(this.name);
        }
    }
}

class ImageViewer { // 2D视图区
    constructor(parentUi, name, autoSwitch, cfg, on_img_click) {
        let template = document.getElementById("image-manager-ui-template");
        let imageManagerUi = template.content.cloneNode(true);
        parentUi.appendChild(imageManagerUi);

        let ui = parentUi.lastElementChild;
        this.ui = ui;

        this.cfg = cfg;
    }
    img_lidar_point_map = {};
    get_selected_box = null;
    drawing = false;
    points = [];
    names = ['front', 'left', 'right'];
    name = 'front'; // 当前操作的name
    polyline;

    all_lines = [];

    world = null;
    img = null;

    setImageName(name) {
        this.name = name;
    }

    init_image_op(func_get_selected_box) {
        this.get_selected_box = func_get_selected_box;
    }

    clear_main_canvas() {

        for (let i = 0; i < this.names.length; i++) {

            var boxes = this.ui.querySelector(`#svg-${this.names[i]}-boxes`).children// this.ui.querySelector("#svg-boxes").children;

            if (boxes.length > 0) {
                for (var c = boxes.length - 1; c >= 0; c--) {
                    boxes[c].remove();
                }
            }

            var points = document.querySelector(`#svg-${this.names[i]}-points`).children// this.ui.querySelector("#svg-points").children;

            if (points.length > 0) {
                for (var c = points.length - 1; c >= 0; c--) {
                    points[c].remove();
                }
            }
        }
    }

    attachWorld(world) {
        this.world = world;
    };

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
            var calib = this.getCalib(); // 获取当前方向矩阵
            // getCalib内应该返回各个各个方向的矩阵, 而不是只返回当前方向
            if (!calib) {
                return;
            }
            var trans_ratio = this.get_trans_ratio();
            if (trans_ratio) {
                for (let i = 0; i < this.names.length; i++) {

                    var imgfinal = box_to_2d_points(box, calib[this.names[i]]); // 根据当前方向的矩阵和box转换svg
                    // 然后根据图片尺寸再处理一下svg
                    // 那增加box的时候直接传三份不同方向的矩阵和同一个box进入box_to_2d_points内生成各个方向的svg
                    // 然后分别加入三张图
                    if (imgfinal) {
                        var imgfinal = imgfinal.map(function (x, i) {
                            if (i % 2 == 0) {
                                return Math.round(x * trans_ratio.x);
                            } else {
                                return Math.round(x * trans_ratio.y);
                            }
                        })

                        var svg_box = this.box_to_svg(box, imgfinal, trans_ratio);
                        var svg = this.ui.querySelector(`#svg-${this.names[i]}-boxes`);
                        svg.appendChild(svg_box);
                    }
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

            for (let j = 0; j < this.names.length; j++) {

                var imgfinal = box_to_2d_points(box, calib[this.names[j]]);

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

    draw_svg() {
        // draw picture
        for (let i = 0; i < this.names.length; i++) {

            var img = this.world.cameras.getImageByName(this.names[i]);

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

            let svg = this.ui.querySelector(`#svg-${this.names[i]}-boxes`);

            // draw boxes
            this.world.annotation.boxes.forEach((box) => {
                if (box.draw) {
                    var imgfinal = box_to_2d_points(box, calib[this.names[i]]);
                    if (imgfinal) {
                        var box_svg = this.box_to_svg(box, imgfinal, trans_ratio, this.get_selected_box() == box);
                        svg.appendChild(box_svg);
                    }
                }
            });

            svg = this.ui.querySelector(`#svg-${this.names[i]}-points`);

            // draw radar points
            if (this.cfg.projectRadarToImage) {
                this.world.radars.radarList.forEach(radar => {
                    let pts = radar.get_unoffset_radar_points();
                    let ptsOnImg = points3d_to_image2d(pts, calib[this.names[i]]);

                    // there may be none after projecting
                    if (ptsOnImg && ptsOnImg.length > 0) {
                        let pts_svg = this.points_to_svg(ptsOnImg, trans_ratio, radar.cssStyleSelector);
                        // svg0.appendChild(pts_svg);
                        svg.appendChild(pts_svg);
                    }
                });
            }

            // project lidar points onto camera image   
            if (this.cfg.projectLidarToImage) {
                let pts = this.world.lidar.get_all_points();
                let ptsOnImg = points3d_to_image2d(pts, calib[this.names[i]], true, this.img_lidar_point_map, img.width, img.height);

                // there may be none after projecting
                if (ptsOnImg && ptsOnImg.length > 0) {
                    let pts_svg = this.points_to_svg(ptsOnImg, trans_ratio);
                    // svg0.appendChild(pts_svg);
                    svg.appendChild(pts_svg);
                }
            }

        }
    }

    hide() {
        this.ui.style.display = "none";
    };

    show() {
        this.ui.style.display = "";
    };

    hidden() {
        this.ui.style.display == "none";
    };

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

    getCalib() {
        var scene_meta = this.world.sceneMeta;

        if (!scene_meta.calib.camera) {
            return null;
        }

        var calib = {
            front: scene_meta.calib.camera.front,
            left: scene_meta.calib.camera.left,
            right: scene_meta.calib.camera.right
        }

        return calib;
    }
    // 加3D操作3D的步骤全部移动到imageViewer,

    get_trans_ratio() {
        const img = this.world.cameras.getImageByName(this.name);

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

    show_all_image() {
        for (let i = 0; i < this.names.length; i++) {

            var board = document.querySelector(`#svg-${this.names[i]}-image`);

            var img = this.world.cameras.getImageByName(this.names[i]);

            if (img == undefined) return;

            board.setAttribute("href", img.src);
        }
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

    render_2d_image() { // 渲染方法在图片内, 那么同时渲染至两处该是合理的
        if (this.cfg.disableMainImageContext) return;

        this.clear_main_canvas();

        this.show_all_image();

        this.draw_svg();
    }

    hide_canvas() {
        this.ui.style.display = "none";
    }

    show_canvas() {
        this.ui.style.display = "inline";
    }
}

class ImageEditor { // 图片编辑器

    world = null;
    start = false; // 当前是否正在拖放添加矩形
    topDot = null; // 拖拽模式下鼠标拖拽顶点的斜对顶点
    vector = null; // 当前向量
    isDrag = false; // 当前是否为拖拽(移动)模式
    rectData = null; // 鼠标坐标, 数组[x, y]
    startDom = null; // 当前正在添加(鼠标未弹起)的矩形id
    obj_id_3d = null; // 当前受选3D标注的obj_id
    basic_color = '#fff';
    ui = d3.select('#image-board');
    id_now_select = 'id_now_select_default'; // 当前选中的标注(2D/3D)
    annotation_2d = { obj_type: 'annotation_2d', psr: [] };

    getRate() {
        const boardData = getDomInfo(document.querySelector('#image-board'));
        const rates = {
            rateX: 2048 / boardData.width,
            rateY: 1536 / boardData.height
        }
        return rates;
    }

    attachWorld(world) {
        this.world = world;
        this.annotate_pic_reapply(this.name);
        this.annotate_pic_id_list();
        this.create_wrapper_observer();
    }

    create_wrapper_observer() { // 观察image-wrapper
        const image_wrapper = document.querySelector('#image-board');
        const observer = new MutationObserver(() => { this.update_label_debounce() });
        observer.observe(image_wrapper, { attributes: true });
    }

    annotate_pic_init() { // 初始化图片标注
        const svg = this.ui.select('#maincanvas-svg');
        const act = this.ui.select('#header-modify');
        const list = this.ui.select('#header-id-list');

        act.text('调整');

        this.createDrag();
        svg.on('mouseup', (e) => { this.annotate_pic_mouse_up(e) });
        svg.on('mousemove', (e) => { this.annotate_pic_mouse_move(e) });
        svg.on('mousedown', (e) => { this.annotate_pic_mouse_down(e) });

        act.on('click', () => { this.annotate_pic_finish() });
        list.on('click', () => { this.annotate_pic_id_list() }); // 及时更新可用id列表

        // 星标
        const positionXY = svg.append('g').attr('class', 'line-g');
        svg.append('g').attr('id', 'rect-g'); // 标注组
        positionXY.append('line').attr('id', 'line-x').attr('x1', 0).attr('y1', 0).attr('x2', 2048).attr('y2', 0).style('stroke', 'white').attr('stroke-width', 0);
        positionXY.append('line').attr('id', 'line-y').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1536).style('stroke', 'white').attr('stroke-width', 0);
        positionXY.append('circle').attr('id', 'line-circle').attr('cx', -10).attr('cy', -10).attr('r', 5).attr('fill', 'red');

        // 这个时刻没有world, 不能在此重应用
        this.ui.select('#header-save').on('click', () => { this.annotate_pic_save() });
    }

    annotate_pic_set_id() {
        const id = this.ui.select('#header-id-list').property('value');
        d3.select(`#${this.id_now_select}-rect`).attr(`obj_id`, id);
    }

    annotate_pic_clear() { // 清除全部标注
        d3.selectAll('#rect-g > g').remove();
        this.annotate_pic_clear_label();
    }

    annotate_pic_reapply(vector) {
        // if (this.vector === vector) return;
        this.vector = vector;
        const data = this.world.annotation_2d.psr;
        const container = d3.select('#rect-g');
        data.forEach((item) => {
            if (item.vector !== vector) return; // 方向不同跳过
            const rect = container.append('g')
                .attr('id', item.id.substring(0, item.id.length - 5))
                .append('rect')
                .attr('obj_id', item.obj_id)
                .attr('fill-opacity', '0.3')
                .attr('height', item.height)
                .attr('width', item.width)
                .style('stroke', this.get_color_by_obj_id(item.obj_id))
                .attr('fill', this.get_color_by_obj_id(item.obj_id))
                .attr('id', item.id)
                .attr('x', item.x)
                .attr('y', item.y)

            this.annotate_pic_mouse_enter(rect);
            this.annotate_pic_anno_click(rect);
            // 在此处add_label, annotate_pic_update_label取不到DOM信息, 务必在reapply完成后添加label
        })
        this.annotate_pic_update_label();
        // 此时dom仍未完成, 不能在此对box上色
    }

    get_box_by_obj_id(obj_id) {
        const target = this.world.annotation.boxes.find((item) => { // item.obj_track_id新增box的时候是数字型, 非新增是str
            return Number(item.obj_track_id) === Number(obj_id);
        });
        return target;
    }

    annotate_pic_id_list() {
        const id_list = this.world.annotation.boxes.map((item) => item.obj_track_id).sort((a, b) => a - b);
        let obj_list_str = id_list.reduce((prev, curr) => {
            return `${prev}<option value="${curr}">${curr}</option>`;
        }, '<option></option>');
        this.ui.select('#header-id-list').html(obj_list_str);
    }

    Drag = null; // Drag函数

    annotate_pic_finish() { // finish之后可以自动清一下没id的框
        const act = this.ui.select('#header-modify');
        const sta = this.ui.select('#header-state');
        const del = this.ui.select('#header-delete');
        const idList = this.ui.select('#header-id-list');
        const show = this.ui.select('#header-show');
        const hide = this.ui.select('#header-hide');
        if (!this.isDrag) {
            act.text('完成');
            sta.text('调整中...').style('color', '#ffffff');

            del.style('display', 'block').on('click', () => { this.annotate_pic_delete() });
            idList.style('display', 'block').on('change', () => { this.annotate_pic_set_id() });
            hide.style('display', 'block').on('click', () => { this.annotate_pic_hide() });
            show.style('display', 'block').on('click', () => { this.annotate_pic_show_all() });
        } else {
            act.text('调整');
            sta.text('');

            del.style('display', 'none');
            idList.style('display', 'none');
            show.style('display', 'none');
            hide.style('display', 'none');

            d3.selectAll('#rect-g > g > circle').remove();
            d3.select(`#${this.id_now_select}-rect`).style('stroke', this.basic_color).attr('fill', this.basic_color);
        }
        this.isDrag = !this.isDrag;
        this.annotate_pic_box_color();
    }

    annotate_pic_hide() { // 隐藏
        const svg = d3.select(`#${this.id_now_select}`);
        if (svg.style('visibility') === 'visible') {
            svg.style('visibility', 'hidden');
        }
    }

    annotate_pic_show_all() { // 显示所有
        d3.selectAll('#svg-boxes > g').style('visibility', 'visible');
        d3.selectAll('#rect-g > g').style('visibility', 'visible');
    }

    annotate_pic_delete() { // 删除
        if (this.obj_id_3d !== null) { // 如果是3D转2D那么仅隐藏
            const rect = this.get_box_by_obj_id(this.obj_id_3d);
            if (rect.obj_track_id === this.obj_id_3d) {
                rect['draw'] = false;
            }
        }
        const target_obj_id = this.get_obj_id_by_id(this.id_now_select);
        this.annotate_pic_remove_label(target_obj_id);

        d3.select(`#${this.id_now_select}`).remove();
    }

    get_obj_id_by_id(id) { // 如果是3D转那么返回'3D'
        let res = null;
        if (id.substring(0, 11) === 'rect-label-') {
            res = id.substring(11, id.length);
            return res;
        }
        if (id.substring(0, 7) === 'rect-g-') {
            res = d3.select(`#${id} > rect`).attr('obj_id');
            return res;
        }
        if (id.substring(0, 14) === 'svg-box-local-') { // 
            res = id.substring(14, id.length);
            return res;
        }
    }

    annotate_pic_save() {
        const allRect = d3.selectAll("#rect-g > g > rect")._groups[0];
        const sta = d3.select('#header-state');

        if (this.annotate_pic_filter(allRect) === false) return;

        this.world['annotation_2d'] = this.annotation_2d; // annotation.js - toBoxAnnotations()
        saveWorldList([this.world]);

        sta.text('保存成功.').style('color', '#ffffff');
        this.annotate_pic_after_switch();
        this.annotate_pic_update_label();
    }

    annotate_pic_box_color() {
        const allRect = d3.selectAll("#rect-g > g > rect")._groups[0]; // allRect没来得及变就直接执行了, 找不到对应id
        for (let i = 0; i < allRect.length; i++) { // 需要判定一下, 如果在finish上色, 但是save上色不需要
            if (d3.select(allRect[i]).attr('obj_id')) {
                d3.select(allRect[i])
                    .attr('fill', this.get_color_by_obj_id(d3.select(allRect[i]).attr('obj_id')))
                    .style('stroke', this.get_color_by_obj_id(d3.select(allRect[i]).attr('obj_id')))
            }
        }
    }

    get_color_by_obj_id(obj_id) {
        const type = this.get_box_by_obj_id(obj_id).obj_type;
        if (!globalObjectCategory.obj_type_map[type]) return '#fff';
        return globalObjectCategory.obj_type_map[type].color;
    }

    annotate_pic_filter(allRect) {
        const sta = this.ui.select('#header-state');
        for (let i = 0; i < allRect.length; i++) {
            const rect = d3.select(allRect[i]);
            if (rect.attr('obj_id') === null) {
                sta.text('驳回: 未知项.').style('color', 'red');
                console.warn('未知项: ', allRect[i]);
                return false;
            }
            const temObj = {
                vector: this.vector,
                obj_id: rect.attr('obj_id'),
                height: rect.attr('height'),
                width: rect.attr('width'),
                id: rect.attr('id'),
                x: rect.attr('x'),
                y: rect.attr('y')
            }
            // 对比当前psr, add/update
            let target = this.annotation_2d.psr.find((item) => {
                return item.obj_id === rect.attr('obj_id') && item.vector === this.vector;
            });
            if (target) { // update
                target = temObj;
            } else { // add
                this.annotation_2d.psr.push(temObj);
            }
        };
        // remove
        if (allRect.length === 0) {
            this.annotation_2d.psr = [];
            return;
        }
        this.annotation_2d.psr = this.annotation_2d.psr.filter((item) => { // 当前方向不再存在的rect从annotation_2d.psr内去除
            return !(item.vector === this.vector && this.allRect_find(allRect, item) === false);
        })
        console.log(this.annotation_2d.psr);
    }
    // 输出处理完的annotation_2d看看都存了什么东西, 应该是错的
    // 如果对, 那么ann_2d在world和本地应该是一致的, 但是现在保存后this.world里的annotation_2d不是最新 

    allRect_find(allRect, rect) { // allRect没有数组方法
        let target = false;
        for (let i = 0; i < allRect.length; i++) {
            if (d3.select(allRect[i]).attr('obj_id') === rect.obj_id) {
                target = true;
                return;
            };
        }
        return target;
    }

    annotate_pic_after_switch() { // 受选标注切换后
        if (this.id_now_select.substring(0, 7) === 'rect-g-') { // 若之前选中2D标注
            d3.select(`#${this.id_now_select}-rect`).style('stroke', this.basic_color).attr('fill', this.basic_color);
            d3.selectAll(`#${this.id_now_select} > circle`).attr('fill', this.basic_color);
            return;
        }
        d3.select(`#${this.id_now_select}`).attr('fill', '');
    }

    annotate_pic_select_3d(obj_local_id) {
        const boxes = this.world.annotation.boxes;
        const target = boxes.find((item) => {
            return Number(item.obj_local_id) === Number(obj_local_id);
        })
        this.obj_id_3d = target.obj_track_id;
        this.ui.select('#header-id-list').property('value', target.obj_track_id);
    }

    annotate_pic_mouse_enter(dom) {
        const that = this;
        dom.on('mouseenter', function () {
            if (that.isDrag) {
                d3.select(this).attr('cursor', 'pointer');
                const ver = [(+d3.select(this).attr('x')), (+d3.select(this).attr('y'))];
                const wh = [(+d3.select(this).attr('width')), (+d3.select(this).attr('height'))];
                const dots = [ver, [ver[0] + wh[0], ver[1]], [ver[0] + wh[0], ver[1] + wh[1]], [ver[0], ver[1] + wh[1]]];
                const id = d3.select(this)._groups[0][0].parentNode.id;

                d3.select(`#${id}`).selectAll('circle').data(dots).enter().append('circle')
                    .attr('cx', d => d[0]).attr('cy', d => d[1]).attr('r', 8).attr('fill', this.basic_color).attr('parent', id)
                    .on('mouseenter', function () {
                        that.Drag(d3.select(this)); // 圆点事件
                    })
            }
        })
    }

    annotate_pic_anno_click(dom) {
        const that = this;
        if (typeof dom === 'string') { // 3D转标注受击
            d3.select(`#${dom}`).on('click', function () {
                if (that.isDrag === false) return;

                const fillColor = d3.select(this).style('stroke');
                d3.select(this).attr('fill', fillColor);

                if (d3.select(this).attr('id') !== that.id_now_select) {
                    that.annotate_pic_after_switch();
                }

                that.id_now_select = d3.select(this).attr('id');
                let local_id = that.get_obj_id_by_id(that.id_now_select);
                that.annotate_pic_select_3d(local_id);
            });
            return;
        }
        dom.on('click', function () { // 2D标注受击
            if (that.isDrag === false) return;

            d3.select(this).style('stroke', 'red').attr('fill', 'red');
            if (d3.select(this).attr('id') !== `${that.id_now_select}-rect`) {
                that.annotate_pic_after_switch();
            }

            that.id_now_select = d3.select(this).attr('id').substring(0, d3.select(this).attr('id').length - 5);
            d3.selectAll(`#${that.id_now_select} > circle`).attr('fill', 'red');

            let obj_id = d3.select(this).attr('obj_id') === null ? `` : d3.select(this).attr('obj_id');

            that.ui.select('#header-id-list').property('value', obj_id);
        })
    }

    annotate_pic_mouse_down(e) {
        if (!this.isDrag) {
            const that = this;
            const id = new Date().getTime() + '';

            const xy = [(+e.offsetX) * this.getRate().rateX, (+e.offsetY) * this.getRate().rateY];

            const rect = d3.select('#rect-g')
                .append('g')
                .attr('id', `rect-g-${id}`)
                .append('rect')
                .style('stroke', this.basic_color)
                .attr('id', `rect-g-${id}-rect`)
                .attr('fill', this.basic_color)
                .attr('fill-opacity', '0.3')
                .attr('x', xy[0])
                .attr('y', xy[1]);

            this.annotate_pic_mouse_enter(rect);
            this.annotate_pic_anno_click(rect);

            this.rectData = xy;
            this.start = true;
            this.startDom = `rect-g-${id}-rect`;
        }
    }

    annotate_pic_mouse_move(e) {
        if (!this.isDrag) {
            const xy = [(+e.offsetX), (+e.offsetY)];
            const xy0 = xy[0] * this.getRate().rateX;
            const xy1 = xy[1] * this.getRate().rateY;

            // 更新星标
            d3.select('#line-x')
                .attr('x1', 0)
                .attr('y1', xy1)
                .attr('x2', 2048)
                .attr('y2', xy1)
                .style('stroke', 'white')
                .attr('stroke-width', 2);

            d3.select('#line-y')
                .attr('x1', xy0)
                .attr('y1', 0)
                .attr('x2', xy0)
                .attr('y2', 1536)
                .style('stroke', 'white')
                .attr('stroke-width', 2);

            d3.select('#line-circle')
                .attr('cx', xy0)
                .attr('r', 10)
                .attr('cy', xy1)
                .attr('fill', 'red');

            if (this.start) {
                let top
                if (xy0 >= this.rectData[0]) {
                    if (xy1 >= this.rectData[1]) {
                        top = this.rectData;
                    } else {
                        top = [this.rectData[0], xy1];
                    }
                } else {
                    if (xy1 >= this.rectData[1]) {
                        top = [xy0, this.rectData[1]];
                    } else {
                        top = xy;
                    }
                }

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
            this.start = false;
            this.startDom = '';
            this.rectData = [];
        }
    }

    createDrag() { // 拖拽
        let color, widget;
        const that = this;
        this.Drag = d3.drag()
            .on('start', function () {
                color = d3.select(this).attr('fill');
                widget = d3.select(this).attr('fill', 'lime');
                const id = widget._groups[0][0].parentNode.id;
                if (widget._groups[0][0].localName === 'circle') {
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
                        .attr('cx', d => d[0]).attr('cy', d => d[1]).attr('r', 10).attr('fill', this.basic_color).attr('parent', id)
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

    get_rect_by_obj_id(obj_id) { // 依据obj_id查找svg, 返回右上角坐标, 不该频繁调用
        const rectAll = d3.selectAll('#rect-g > g > rect')._groups[0];
        for (let i = 0; i < rectAll.length; i++) {
            if (d3.select(rectAll[i]).attr('obj_id') === obj_id) {
                return {
                    x: (Number(d3.select(rectAll[i]).attr('x')) + Number(d3.select(rectAll[i]).attr('width'))) / this.getRate().rateX,
                    y: Number(d3.select(rectAll[i]).attr('y')) / this.getRate().rateY
                };
            }
        }
    }

    update_label_debounce() { // 拖拽防抖
        var timer = null;
        const that = this;
        return function () {
            if (timer !== null) {
                clearTimeout(timer);
            }
            timer = setTimeout(that.annotate_pic_update_label.bind(that), 400);
            // setTimeout回调函数this指向window
            // bind创建新函数, 参数作为新函数this
        }()
    }

    annotate_pic_update_label() {
        this.annotate_pic_clear_label();
        this.world.annotation_2d.psr.forEach((item) => {
            this.annotate_pic_add_label(item.obj_id);
        })
    }

    annotate_pic_add_label(obj_id) {
        const pos = this.get_rect_by_obj_id(obj_id);
        if (pos === undefined) return;

        const box = this.get_box_by_obj_id(obj_id);

        let label_text = '<div class="rect-label-obj-type">';
        label_text += box.obj_type;
        label_text += '</div>';

        label_text += '<div class="rect-label-obj-id">';
        label_text += obj_id;
        label_text += '</div>';

        d3.select('#svg-floating-labels')
            .append('div')
            .attr('id', `rect-label-${obj_id}`)
            .attr('class', 'float-label')
            .style('color', this.get_color_by_obj_id(obj_id))
            .style('left', `${pos.x}px`)
            .style('top', `${pos.y}px`)
            .html(label_text);
    }

    annotate_pic_clear_label() { // slay all
        d3.selectAll('#svg-floating-labels > div').remove();
    }

    annotate_pic_remove_label(obj_id) { // 未限制id唯一, selectAll
        d3.selectAll(`#svg-floating-labels > #rect-label-${obj_id}`).remove();
    }
}

class ImageContextManager { // 图片管理器
    constructor(parentUi, selectorUi, cfg, on_img_click) {
        this.parentUi = parentUi;
        this.selectorUi = selectorUi;
        this.cameras = null;
        this.cfg = cfg;
        this.on_img_click = on_img_click;

        this.addImage("", true);

    }
    images = [];

    updateCameraList(cameras) { // 改成给下拉框赋值
        /* this.cameras = cameras;

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
        ui.style.display = "none"; */

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

    addImage(name, autoSwitch) {

        if (autoSwitch && this.bestCamera && !name)
            name = this.bestCamera;

        let image = new ImageViewer(this.parentUi, name, autoSwitch, this.cfg, this.on_img_click);

        this.images.push(image);

        if (this.init_image_op_para) {
            image.init_image_op(this.init_image_op_para);
        }

        if (this.world) {
            image.attachWorld(this.world);
            image.render_2d_image();
        }

        let selectorName = autoSwitch ? "auto" : name;

        /* let ui = this.selectorUi.querySelector("#camera-item-" + selectorName);
        if (ui)
            ui.className = "camera-item camera-selected"; */


        return image;
    }

    removeImage(image) {

        let selectorName = image.autoSwitch ? "auto" : image.name;
        // this.selectorUi.querySelector("#camera-item-" + selectorName).className = "camera-item";
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
        this.images.forEach(i => {
            i.attachWorld(world)
        });
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

    init_image_op(op) { // 管理器接受方法然后调用每个受管理图片上的该方法
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


export { ImageContextManager, BoxImageContext, ImageViewer, ImageContext };
