(function () {
  'use strict';

  // https://editor.p5js.org/jht9629-nyu/sketches/xxx
  // faceMesh v9 photo

  window.my = {};
  window.colorPalette = ['red', 'green', 'gold', 'black'];

  function setup() {
    // createCanvas(640, 480);

    pixelDensity(1);

    my_init();

    let nh = Math.floor(windowHeight * (my.top_percent / 100));
    my.canvas = createCanvas(windowWidth, nh);

    video_setup();

    create_ui();

    setup_dbase();

    // delay any photo add for 5 secs during startup
    add_action_block(5);

    setup_scroll();
  }

  function setup_scroll() {
    //
    my.scrollerEnabled = 0;

    my.scrollTimer = new PeriodTimer(10);
    my.nscrollImages = -1;
    my.scrollTopLocationY = 0;

    scroller_init();

    my.scrollBy = 1;
    my.stallMaxTime = 2;
    scroller_pause();
  }

  function run_scroll() {
    //
    if (!my.scrollerEnabled) return;

    if (my.face_hidden) {
      scroller_update();
      if (my.scrollTimer.completed()) {
        if (scroller_isActive() && scroller_isStalled()) {
          scroller_pause();
        } else {
          scroller_resume();
        }
      }
    }
  }

  async function video_setup() {
    //
    console.log('video_setup await video_init');

    await video_init();

    // console.log('video_setup new eff_bars');

    my.bars = new eff_bars({ width: my.video.width, height: my.video.height });

    my.input = my.video;

    ml5.setBackend('webgl'); // !!@ ml5@1.2.0 patch
    faceMesh_init();

    my.bestill = new eff_bestill({ factor: 10, input: my.output });

    console.log('video_setup return');
  }

  function draw() {
    //
    run_scroll();

    photo_list_update_poll();

    proto_prune_poll();

    let str = my.photo_list.length + ' ' + my.photo_index;
    my.photo_count_span.html(str);

    if (my.imgLayer) {
      let clr = my.imgLayer.get(0, 0);
      document.body.style.backgroundColor = `rgb(${clr[0]},${clr[1]},${clr[2]}`;
    } else {
      let clr = [0, 0, 0];
      document.body.style.backgroundColor = `rgb(${clr[0]},${clr[1]},${clr[2]}`;
    }

    my.lipsDiff = 0;

    if (!my.faces) return;

    if (my.faces.length > 0) {
      first_mesh_check();
    }

    check_show_hide();

    if (my.show_mesh) {
      draw_mesh();
    } else {
      image(my.video, 0, 0);
      if (my.imgLayer) {
        image(my.imgLayer, width / 2, 0);
      }
    }
  }

  // wait 0.5 seconds before showing face mesh
  // to avoid false flashes
  function check_show_hide() {
    if (!my.show_hide_taken) {
      if (my.faces.length == 0) {
        hide_action();
        my.hiden_time = Date.now() / 1000;
      } else {
        if (my.hiden_time) {
          let now = Date.now() / 1000;
          let diff = now - my.hiden_time;
          if (diff > 0.5) {
            my.hiden_time = 0;
            show_action();
          } else {
            // console.log('hiden wait diff', diff);
          }
        } else {
          my.hiden_time = 0;
          show_action();
        }
      }
    }
  }

  function draw_mesh() {
    my.output.background(my.avg_color);

    // Draw all the tracked face points
    for (let face of my.faces) {
      draw_face_mesh(face);
      draw_mouth_shape(face);
      draw_lips_line(face);
      draw_eye_shape(face);
      draw_eye_lines(face);
      // draw_face_circle(face);
      my.face1 = face;
    }

    my.bestill.prepareOutput();
    image(my.bestill.output, 0, 0);

    // let phase = my.lipsOpenCount % 3;
    // let phase = my.lipsOpenCount % 2;
    // let phase = 2;
    // if (phase == 0) {
    //   overlayEyesMouth();
    // } else if (phase == 1) {
    //   overlayEyesMouthBars();
    // }
    overlayEyesMouthBars();
    overlayEyesMouth();

    trackLipsDiff();
  }

  function trackLipsDiff() {
    //
    if (my.face_hidden) {
      let lapse = lipsOpenLapseSecs();
      // console.log('trackLipsDiff face_hidden lapse', lapse);
      if (lapse < my.add_action_delay) {
        // console.log('trackLipsDiff return lapse', lapse, 'my.lipsOpenState', my.lipsOpenState);
        if (!lipsAreOpen()) {
          my.lipsOpenState = 0;
        }
        return;
      }
    }

    if (lipsAreOpen()) {
      if (my.lipsOpenState == 0) {
        // edge into lips opened
        my.lipsOpenStartTime = Date.now();
        my.lipsOpenCount++;
        // console.log('lips open my.lipsOpenCount', my.lipsOpenCount, 'my.lipsDiff', my.lipsDiff);
        // console.log('my.lipsOpenState', my.lipsOpenState, 'openSecs', lipsOpenLapseSecs());
        my.lipsOpenState = 1;
      } else if (my.lipsOpenState == 1) {
        // lips already open
        let lapse = lipsOpenLapseSecs();
        if (lapse > my.add_action_delay) {
          if (my.add_action_timeoutid) {
            console.log('trackLipsDiff return add_action_timeoutid', my.add_action_timeoutid);
            return;
          }
          console.log('lips open add_action', lipsOpenLapseSecs());
          add_action();
          add_action_block(my.add_action_delay);
          my.lipsOpenState = 2;
        }
      } else {
        // lips open already trigger add
        // console.log('my.lipsOpenState', my.lipsOpenState, 'openSecs', lipsOpenLapseSecs());
      }
    } else {
      // lips NOT open
      if (my.lipsOpenState) {
        lipsOpenLapseSecs();
      }
      my.lipsOpenState = 0;
    }
  }

  function lipsAreOpen() {
    return my.lipsDiff > 0.05;
  }

  function lipsOpenLapseSecs() {
    if (!lipsAreOpen()) {
      my.lipsOpenStartTime = Date.now();
      return 0;
    }
    let lapse = (Date.now() - my.lipsOpenStartTime) / 1000;
    // console.log('lipsOpenLapseSecs lapse', lapse);
    return lapse;
  }

  function add_action_block(delay) {
    let mdelay = delay * 1000;
    my.add_action_timeoutid = setTimeout(add_action_unblock, mdelay);
  }

  function add_action_unblock() {
    console.log('add_action_unblock add_action_timeoutid', my.add_action_timeoutid);
    my.add_action_timeoutid = 0;
  }

  window.setup = setup;
  window.draw = draw;

  // https://editor.p5js.org/ml5/sketches/lCurUW1TT
  // faceMesh-keypoints --ml5
  /*
   * 👋 Hello! This is an ml5.js example made and shared with ❤️.
   * Learn more about the ml5.js project: https://ml5js.org/
   * ml5.js license and Code of Conduct: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md
   *
   * This example demonstrates face tracking on live video through ml5.faceMesh.
   */

  // https://editor.p5js.org/jht9629-nyu/sketches/9fOM25TRl
  // faceMesh-keypoints --ml5 copy

  // https://editor.p5js.org/jht9629-nyu/sketches/PrJvjyxb6
  // faceMesh mesh_nits

  // https://editor.p5js.org/jht9629-nyu/sketches/7y2gqHeZz
  // faceMesh mesh_nits v2
  // scale to height

  // https://editor.p5js.org/jht9629-nyu/sketches/hFnQmY-Jy
  // faceMesh mesh_nits v3
  // fit to width

  // frameRate()
  // 36.63003701391713

  // https://editor.p5js.org/jht9629-nyu/sketches/p4Uu0B2sk
  // faceMesh mesh_nits v4
  // fill to width and height

  // https://editor.p5js.org/jht9629-nyu/sketches/nDEtGRehq
  // faceMesh mesh_nits v5

  // https://editor.p5js.org/jht9629-nyu/sketches/fsOAbI6SJ
  // faceMesh mesh_nits v6 -- stray mask

  // https://editor.p5js.org/jht9629-nyu/sketches/PuoF9-3xy
  // faceMesh mesh_nits v7 mask

  // https://editor.p5js.org/jht9629-nyu/sketches/_3QMiI-fM
  // faceMesh mesh_nits v8 bestill

  //
  function my_init$1() {
    // updated to verify change on mobile
    my.version = '?v=15';
    my.appTitle = 'Facemesh';
    my.isRemote = 1;
    // show detailed log
    my.logLoud = 1;

    my.add_action_delay = 0.5;
    my.lipsDiff = 0;

    my.fireb_config = 'jht9629';
    // my.fireb_config = 'jht1493';
    // my.fireb_config = 'jhtitp';
    my.dbase_rootPath = 'm0-@r-@w-';
    my.mo_app = 'mo-facemesh';
    // my.mo_room = 'm2-facemesh';
    // my.mo_group = 's0';
    my.nameDevice = 'facemesh';

    my.photo_index = 0;
    my.photo_max = 512;
    // my.photo_max = 4;
    my.photo_list = [];
    my.photo_list_update_enabled = 1;
    my.photo_list_render_active = 0;

    let scale = 0.5;
    // let scale = 1.0;
    my.vwidth = 480 * scale;
    my.vheight = 640 * scale;
    // my.vwidth = 640 * scale;
    // my.vheight = 480 * scale;
    my.top_percent = 80;
    my.long = 0;

    // my.imageQuality = 1;
    my.imageQuality = 0.5;
    my.imageExt = '.jpg';

    my.query = get_url_params();
    if (my.query) {
      if (my.query.app) {
        my.mo_app = my.query.app;
        // mo-m5body --> m5body
        my.nameDevice = my.mo_app.substring(3);
      }
      if (my.query.room) {
        // my.mo_room = my.query.room + '-facemesh';
        // mo-m5body --> -m5body
        my.mo_room = my.query.room + my.mo_app.substring(2);
      } else {
        my.mo_room = 'm4' + my.mo_app.substring(2); // 2025-08-07 default
        // my.mo_room = 'm3' + my.mo_app.substring(2); // 2024-12-02 default
        // my.mo_room = 'm3-facemesh'; // 2024-11-06 default
        // my.mo_room = 'm2-facemesh'; // 2024-11-05 default
      }
      if (my.query.group) {
        my.mo_group = my.query.group;
      }
      my.isRemote = parseFloat(my.query.remote || my.isRemote);
      my.photo_max = parseFloat(my.query.photo_max || my.photo_max);
      my.top_percent = parseFloat(my.query.top_percent || my.top_percent);
      my.long = parseFloat(my.query.long || my.long);
      my.showButtons = parseFloat(my.query.show_buttons || my.showButtons);
      my.showRemove = parseFloat(my.query.show_remove || my.showRemove);
    }
    if (my.long) {
      [my.vwidth, my.vheight] = [my.vheight, my.vwidth];
    }
    // console.log('my.vwidth, my.vheight', my.vwidth, my.vheight, 'my.long', my.long);

    if (!my.mo_group) {
      my.mo_group = 's0';
      my.showButtons = 1;
      my.showRemove = 1;
    }
    if (!my.mo_room) {
      my.mo_room = my.mo_group + '-facemesh';
    }

    my.qrcode_url = () => {
      return `qrcode/${my.mo_group}.png`;
    };
    my.showQRCode = () => {
      // qrCode is only shown for screen width greater than 800
      return window.innerWidth > 800;
    };

    if (my.showRemove) {
      my.photo_max = Number.MAX_SAFE_INTEGER;
    }
    my.show_mesh = 1;
    if (windowWidth > windowHeight) {
      my.footerHeight = '210px';
      my.qrCodeWidth = '12%';
    } else {
      my.footerHeight = '288px';
      my.qrCodeWidth = '25%';
    }
    console.log('my.qrCodeWidth', my.qrCodeWidth);

    window_resized();

    console.log('mo_room', my.mo_room, 'mo_group', my.mo_group);
  }

  window.addEventListener('resize', window_resized);

  function window_resized() {
    my.gallery_margin = '40px';
    let perRow = 4.4; // 6.1
    my.thumbWidth = Math.floor(windowWidth) / perRow;
    console.log('window_resized my.thumbWidth', my.thumbWidth);
    if (my.thumbWidth < 120) {
      perRow = 4.5;
      my.thumbWidth = Math.floor(windowWidth) / perRow;
      my.gallery_margin = '20px';
    }
    // my.gallery_margin = '0px';
    console.log('window_resized windowWidth', windowWidth, 'my.thumbWidth', my.thumbWidth);
  }

  window.my_init = my_init$1;

  async function setup_dbase$1() {
    //
    await dbase_app_init(my);

    // !!@ vote uses dbase_devices_observe

    observe_meta();

    observe_photo_store();

    // stopLoader(); // for init
    my.waiting_for_first_mesh = 1;
    // startLoader();
  }

  function observe_meta() {
    dbase_app_observe({ observed_item }, 'item');
    function observed_item(item) {
      // console.log('observed_item item', item);
      // console.log('observed_item item.photo_index', item.photo_index);
      if (item.photo_index != undefined) {
        my.photo_index = item.photo_index;
      }
      photo_list_update();
    }
  }

  function observe_photo_store() {
    dbase_app_observe({ observed_event }, 'photo_store');
    my.photo_store = {};
    function observed_event(event, key, item) {
      // console.log('photo_store observed_event ', event, key, item);
      switch (event) {
        case 'add':
        case 'change':
          my.photo_store[key] = item;
          break;
        case 'remove':
          delete my.photo_store[key];
          my.photo_prune_pending = 1;
          break;
      }
      photo_list_update();
    }
  }

  function add_action_startLoader$1() {
    startLoader();
    if (!my.add_action_loading) my.add_action_loading = 0;
    my.add_action_loading++;
    if (my.add_action_loading == 1) {
      my.add_action_startTime = Date.now();
    }
    console.log('add_action_startLoader ', my.add_action_loading);
  }

  function add_action_stopLoader$1() {
    if (my.add_action_loading) {
      stopLoader();
      my.add_action_loading--;
      let lapse = (Date.now() - my.add_action_startTime) / 1000;
      console.log('add_action_stopLoader ', my.add_action_loading, 'lapse', lapse);
    }
  }

  function first_mesh_check$1() {
    if (my.waiting_for_first_mesh) {
      my.waiting_for_first_mesh = 0;
      stopLoader();
    }
  }

  window.setup_dbase = setup_dbase$1;
  window.first_mesh_check = first_mesh_check$1;
  window.add_action_startLoader = add_action_startLoader$1;
  window.add_action_stopLoader = add_action_stopLoader$1;

  //

  // mediaDev
  // my.mediaDevices = [
  //    { label, deviceId, capture, stream }]

  // !!@ to lib mediaDevices.js
  // mediaDevices_preflight
  // mediaDevices_enum
  // mediaDevice_create_capture

  // Ask for default video to prevent video permission
  // and avoid overly constrain error
  //
  async function mediaDevices_preflight$1() {
    // console.log('video_preflight enter');
    return new Promise(function (resolve, reject) {
      let video = createCapture(VIDEO, function (stream) {
        // console.log('video_preflight stream', stream);
        video.remove();
        resolve();
      });
    });
  }

  // Optional: dim = { width, height} for capture size
  //
  function mediaDevices_enum$1() {
    // console.log('mediaDevices_enum enter');
    my.mediaDevices = [];
    return new Promise(function (resolve, reject) {
      mediaDevices_enum_promise(resolve, reject);
    });
  }

  function mediaDevices_enum_promise(resolve, reject) {
    // console.log('mediaDevices_enum_promise enter');
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.log('enumerateDevices() not supported.');
      reject(new Error('enumerateDevices() not supported.'));
    }
    // List cameras and microphones.
    navigator.mediaDevices
      .enumerateDevices()
      .then(function (devices) {
        devices.forEach(function (device) {
          // console.log('device', device);
          // console.log(
          //   device.kind + ': ' + device.label + ' id=|' + device.deviceId + '|'
          // );
          if (device.kind == 'videoinput') {
            // console.log('media_enumdevice.deviceId=' + device.deviceId);
            console.log('media_enum label=' + device.label);
            console.log('media_enum deviceId=' + device.deviceId);
            let { label, deviceId } = device;
            if (!deviceId) {
              label = 'No-id-' + random();
            }
            my.mediaDevices.push({ label, deviceId });
          }
        });
        // console.log('a_mediaDevices', a_mediaDevices);
        resolve();
      })
      .catch(function (err) {
        console.log(err.name + ': ' + err.message);
        reject(err);
      });
  }

  // options = { dim, flipped, audio }
  //    dim = { width, height }
  //
  function mediaDevice_create_capture$1(mediaDev, options) {
    // console.log('mediaDevice_create_capture enter');
    return new Promise(function (resolve, reject) {
      create_capture_promise(mediaDev, options, resolve, reject);
    });
  }

  function create_capture_promise(mediaDev, options, resolve, reject) {
    // console.log('mediaDevice_capture_init enter');
    let { dim, flipped, audio } = options;
    let vcap = {
      audio,
      video: {
        deviceId: { exact: mediaDev.deviceId },
      },
    };
    if (dim && dim.width && dim.height) {
      vcap.video.width = { exact: dim.width };
      vcap.video.height = { exact: dim.height };
    }
    // console.log('create_mediaDevices dim', dim);
    // console.log('create_mediaDevices vcap', vcap);

    // !!@ flipH=true does not take unless capture is sized immediately
    // let capture = createCapture(VIDEO, { flipped: flipH });
    // capture.size(capture.width, capture.height);

    let capture = createCapture(vcap, { flipped }, function (stream) {
      mediaDev.stream = stream;
      console.log('create_mediaDevices mediaDev', mediaDev);
      // console.log('create_mediaDevices capture.loadedmetadata', capture.loadedmetadata);
      // console.log('create_mediaDevices capture.width', capture.width);
      // console.log('create_mediaDevices capture.elt.width', capture.elt.width);
      // capture.width and height now valid
      // resolve(capture);
      resolve(mediaDev);
      // alert('init_device_capture DONE deviceId=|' + mediaDevice.deviceId + '|');
    });

    capture.elt.muted = true;
    mediaDev.capture = capture;
  }

  window.mediaDevices_preflight = mediaDevices_preflight$1;
  window.mediaDevices_enum = mediaDevices_enum$1;
  window.mediaDevice_create_capture = mediaDevice_create_capture$1;

  //

  let PeriodTimer$1 = class PeriodTimer {
    // PeriodTimer(period)
    //    period = seconds between trigger
    //      = -1 to never trigger
    //
    constructor(period) {
      this.period = period;
      this.restart();
    }
    restart() {
      this.lastTime = Date.now();
    }
    lapse() {
      let timeNow = Date.now();
      return (timeNow - this.lastTime) / 1000;
    }
    completed(period_next) {
      let timeNow = Date.now();
      let lapse = (timeNow - this.lastTime) / 1000;
      if (this.period >= 0 && lapse > this.period) {
        this.lastTime = timeNow;
        if (period_next) period_next();
        return 1;
      }
      return 0;
    }
  };

  window.PeriodTimer = PeriodTimer$1;

  //

  function scroller_init$1() {
    //
    my.scrollIndex = 0;
    my.scrollSpeeds = [0, 1, 2];
    // my.scrollSpeeds = [0, 1, 8, 16, 32, 1];
    my.scrollDirection = 1;
    my.scrollBy = 0;
    my.scrollTopLocationY = 1080;

    // my.scrollEnabled = 0;
    my.stallMaxTime = 10.0;

    my.rwidth = 1920;

    // for m5body with installed images
    let images = [];
    let n = my.nscrollImages;
    for (let index = 0; index <= n; index++) {
      let path = `${my.scrollerImagesPath}/${index}.png`;
      let altText = 'image' + index;
      images.push({ path, altText });
    }
    my.images = images;

    if (n > 0) {
      received_gallery(my.images);
    }
  }

  function scrollerEnabled_toggle$1() {
    my.scrollerEnabled = !my.scrollerEnabled;
    if (my.scrollerEnabled) {
      if (!scroller_isActive$1()) {
        scroller_resume$1();
      }
    } else {
      if (scroller_isActive$1()) {
        scroller_pause$1();
      }
    }
  }

  function scroller_isActive$1() {
    return my.scrollBy != 0;
  }

  function scroller_pause$1() {
    if (my.scroll_topLocationY) {
      window.scrollTo(0, my.scroll_topLocationY);
    }
    if (my.scrollTimer) {
      my.scrollTimer.restart();
    }
    if (my.scrollBy == 0) {
      return;
    }
    my.scrollByPrior = my.scrollBy;
    my.scrollBy = 0;
  }

  function scroller_resume$1() {
    my.scrollBy = my.scrollByPrior;
  }

  function scroller_next(dir) {
    my.scrollDirection = dir;
    my.scrollByPrior = my.scrollBy;
    my.scrollBy = 1080 * dir;
    my.scrollRestorePending = 1;
    // console.log('scroller_faster scrollBy', my.scrollBy);
  }

  function scroller_faster(dir) {
    my.scrollDirection = dir;
    my.scrollIndex = (my.scrollIndex + 1) % my.scrollSpeeds.length;
    my.scrollBy = my.scrollSpeeds[my.scrollIndex];
    // console.log('scroller_faster dir', my.scrollDirection, 'scrollIndex', my.scrollIndex, 'scrollBy', my.scrollBy);
  }

  function scroller_update$1() {
    // console.log(
    //   'scroller_update scrollBy',
    //   my.scrollBy,
    //   'scrollDirection',
    //   my.scrollDirection,
    //   'scrollRestorePending',
    //   my.scrollRestorePending
    // );

    if (my.scrollBy == 0) return;
    // console.log('scroller_update scrollBy not zero', my.scrollBy);

    let f = 60 / frameRate();
    let scrollBy = my.scrollBy;
    if (!my.scrollRestorePending) {
      scrollBy = Math.round(scrollBy * f) * my.scrollDirection;
    }

    window.scrollBy(0, scrollBy);
    // console.log('scroller_update scrollBy ', scrollBy);

    if (scroller_isStalled$1()) {
      // when scroll reaches end wait 5 seconds then restart
      //
      if (!my.scrollResetPending) {
        my.scrollResetPending = 1;
        setTimeout(function () {
          scroller_reset();
          my.scrollResetPending = 0;
        }, 5000);
      }
    }

    if (my.scrollRestorePending) {
      my.scrollRestorePending = 0;
      my.scrollBy = my.scrollByPrior;
    }
  }

  function scroller_reset() {
    window.scrollTo(0, my.scroll_topLocationY);
    my.lastY = 0;
    my.scrollStartTime = 0;
    my.scrollDelayTime = 0;
    // my.scrollIndex = 0;
    // my.scrollBy = 0;
  }

  function scroller_isStalled$1() {
    let now = millis() / 1000.0;
    if (!my.scrollStartTime) my.scrollStartTime = now;
    if (!my.lastY || my.lastY != window.scrollY) {
      my.lastY = window.scrollY;
      my.scrollStartTime = now;
      return false;
    }
    // window.scrollY not changed
    //
    let lapse = now - my.scrollStartTime;
    if (lapse > my.stallMaxTime) {
      return true;
    }
    return false;
  }

  // data = [ {path, altText}, ... ]
  //
  function received_gallery(data, opts) {
    window.scrollTo(0, 0);
    let div = ui_div_empty('id_gallery');
    if (!data) {
      return;
    }
    my.imgs = [];

    // for (key in data) {
    //   console.log('key', key);
    //   let val = data[key];

    // Display in reverse order to see new additions first
    // rarr = Object.values(data).reverse();
    let rarr = Object.values(data);
    if (opts && opts.doShuffle) {
      rarr = shuffle(rarr);
    }
    // let r = rarr;
    // rarr = [r[0],r[1],r[0],r[2],r[0],r[3],r[0],r[4],r[0],r[5]];

    nitems = rarr.length;
    for (let ent of rarr) {
      // console.log('received_gallery ent', ent);
      let img = createImg(ent.path, ent.altText, '', function () {
        // console.log('imageLoaded', path);
      });
      div.child(img);

      let iwidth = my.rwidth;
      img.style('width: ' + iwidth + 'px;');
      img.addClass('center-image');
      my.imgs.push(img);
      // ui_init_update();
    }
  }

  window.scroller_init = scroller_init$1;
  window.scroller_update = scroller_update$1;
  window.scroller_pause = scroller_pause$1;
  window.scroller_resume = scroller_resume$1;
  window.scroller_isActive = scroller_isActive$1;
  window.scroller_isStalled = scroller_isStalled$1;
  window.scrollerEnabled_toggle = scrollerEnabled_toggle$1;

  //
  function create_ui$1() {
    //
    ui_begin();

    my.ui_container = createDiv('').id('id_dash_buttons');
    my.ui_container.style('position: fixed; z-index: 100;');
    if (!my.showQRCode()) {
      // Position buttons at bottom of screen
      my.ui_container.style('position: fixed; z-index: 1999; bottom: 0; left: 0');
    }

    let ver = ui_span(0, my.mo_group + my.version);
    ver.elt.style.backgroundColor = 'white';

    // my.loadBtn = ui_createButton('Load');
    // my.loadBtn.mousePressed(load_action_ui);

    my.showBtn = ui_createButton('Show');
    my.showBtn.mousePressed(show_action_ui);

    my.hideBtn = ui_createButton('Hide');
    my.hideBtn.mousePressed(hide_action_ui);

    my.takeBtn = ui_createButton('Take');
    my.takeBtn.mousePressed(take_action);

    if (my.showQRCode()) {
      my.fullScreenBtn = ui_createButton('Full Screen');
      my.fullScreenBtn.mousePressed(fullScreen_action);
    }

    my.scrollBtn = ui_createButton('Scroll');
    my.scrollBtn.mousePressed(() => {
      scrollerEnabled_toggle();
    });

    if (my.showButtons) {
      my.showAllBtn = ui_createButton('Show All');
      my.showAllBtn.mousePressed(showAll_action);

      my.addBtn = ui_createButton('Add');
      my.addBtn.mousePressed(add_action);

      my.meshBtn = ui_createButton('Mesh');
      my.meshBtn.mousePressed(mesh_action);

      my.resetBtn = ui_createButton('Reset');
      my.resetBtn.mousePressed(reset_action);
    }
    if (my.showRemove) {
      my.removeBtn = ui_createButton('Remove 1');
      my.removeBtn.mousePressed(remove_action);

      my.removeBtn = ui_createButton('Remove All');
      my.removeBtn.mousePressed(remove_all_action);
    }

    my.photo_count_span = ui_span(0, '' + my.photo_list.length);
    my.photo_count_span.elt.style.backgroundColor = 'white';

    // Move the canvas below all the ui buttons
    let body_elt = document.querySelector('body');
    let main_elt = document.querySelector('main');
    body_elt.insertBefore(main_elt, null);

    // Gallery is below canvas
    my.ui_container = null;
    my.gallery_div = ui_div_empty('id_gallery');
    // my.gallery_div.elt.style.margin = '0px 40px';
    my.gallery_div.elt.style.margin = `0px ${my.gallery_margin}`;
    my.gallery_div.elt.style.fontSize = '0';
    my.gallery_div.elt.style.lineHeight = '0';
  }

  function load_action_ui() {
    console.log('load_action_ui', my.photo_list_update_enabled);
    my.photo_list_update_enabled = 1;
  }

  function img_remove_all() {
    //
    // console.log('photo_remove_all');
    for (;;) {
      let child = my.gallery_div.elt.firstChild;
      // console.log('photo_remove_all child', child);
      if (!child) {
        break;
      }
      child.remove();
    }
    my.gallery_items = {};
  }

  // Return truthy if image key present
  function locate_img_key$1(key) {
    if (!my.gallery_items) return false;
    return my.gallery_items[key];
  }

  // Create image element for an index
  //  or return if already present
  //
  function find_img$1(key, prepend) {
    let id = 'id_img_' + key;
    let img = select('#' + id);
    if (!img) {
      // console.log('find_img id', id);
      let span = createSpan();
      span.id(id);

      img = createImg('', 'image');
      // img.id(id);
      // console.log('find_img createImg', img);

      span.child(img);

      // Add image as first child to see most recent first
      if (prepend) {
        my.gallery_div.elt.prepend(span.elt);
      } else {
        my.gallery_div.elt.append(span.elt);
      }

      let iwidth = my.thumbWidth;
      img.style('width: ' + iwidth + 'px;');

      // span.style('background-color: white');

      // Remember images in my.gallery_items
      if (!my.gallery_items) my.gallery_items = {};
      my.gallery_items[key] = span;
    }
    return img;
  }

  function showAll_action() {
    my.photo_max = Number.MAX_SAFE_INTEGER;
    photo_list_update();
  }

  // Sometimes getting constrain error with createCapture with config params
  // Force video permission then reload page
  //
  function reset_action() {
    my.video = createCapture(VIDEO, function (stream) {
      console.log('reset_action stream', stream);
    });
    console.log('reset_action video', my.video);
    setTimeout(function () {
      // video.remove();
      window.location.reload();
    }, resetDelaySecs * 1000);
  }

  function reset_check() {
    if (my.video) return;
    let resetNow = frameCount > frameRate() * resetDelaySecs;
    if (resetNow && my.mediaDevices.length && !my.mediaDevices[0].stream) {
      reset_action();
    }
  }

  let resetDelaySecs = 7;

  function show_action_ui() {
    first_mesh_check();
    my.show_hide_taken = 0;
    // id_main.classList.remove('hidden');
    show_action$1();
  }

  function hide_action_ui() {
    first_mesh_check();
    my.show_hide_taken = 1;
    // id_main.classList.add('hidden');
    hide_action$1();
  }

  function show_action$1() {
    id_main.classList.remove('hidden');
    my.face_hidden = 0;
    scroller_pause();
  }

  function hide_action$1() {
    id_main.classList.add('hidden');
    my.face_hidden = 1;
  }

  function mesh_action() {
    my.show_mesh = !my.show_mesh;
  }

  function fullScreen_action() {
    ui_toggleFullScreen();
  }

  window.create_ui = create_ui$1;
  window.show_action = show_action$1;
  window.hide_action = hide_action$1;
  window.find_img = find_img$1;
  window.locate_img_key = locate_img_key$1;

  let eff_bars$1 = class eff_bars {
    // props = { width, height }
    constructor(props) {
      Object.assign(this, props);
      this.init();
    }
    init() {
      this.scrollSeconds = 30;
      this.nbars = colorPalette.length;
      // =0 for left to right, else right to left scroll
      this.xtoLeft = 1;
      this.output = createGraphics(this.width, this.height);
      this.xlen = this.width / this.nbars;
      this.ylen = this.height;
      this.items = [];
      let n = this.nbars + 1;
      this.wide = this.xlen * n;
      for (let i = 0; i < n; i++) {
        let xpos = this.xlen * i;
        let color = colorPalette[i % colorPalette.length];
        this.items[i] = { xpos, color };
      }
    }
    prepareOutput() {
      let deltaSecs = deltaTime / 1000;
      this.xstep = (width * deltaSecs) / this.scrollSeconds;
      // console.log('this.xstep', this.xstep);
      let layer = this.output;
      layer.clear();
      for (let item of this.items) {
        let { xpos, color } = item;
        item.xpos = (xpos + this.xstep) % this.wide;
        layer.fill(color);
        let x = xpos - this.xlen;
        let y = 0;
        if (this.xtoLeft) {
          x = layer.width - x;
        }
        layer.rect(x, y, this.xlen, this.ylen);
      }
    }
  };

  // --
  // https://editor.p5js.org/jht9629-nyu/sketches/ZpoPuHXRo
  // ims04-jht scroll color bars - no pop

  // https://editor.p5js.org/jht9629-nyu/sketches/3VKJ-q8ar
  // ims03-jht scrolling color bars
  // color pops on at wrap around

  // From
  // https://editor.p5js.org/jht1493/sketches/5LgILr8RF

  // function full_screen_action() {
  //   fullScreenBtn.remove();
  //   fullscreen(1);
  //   let delay = 3000;
  //   setTimeout(ui_present_window, delay);
  // }

  // function ui_present_window() {
  //   resizeCanvas(windowWidth, windowHeight);
  //   my_setup();
  // }

  // https://editor.p5js.org/jht9629-nyu/sketches/3VKJ-q8ar
  // ims03-jht scrolling color bars

  // https://editor.p5js.org/jht9629-nyu/sketches/2pxhnehBV
  // ims04-jht scroll color rate

  window.eff_bars = eff_bars$1;

  // import { image_copy_to } from '../../util/image.js?v={{vers}}';

  // export default
  let eff_bestill$1 = class eff_bestill {
    // static meta_props = {
    //   factor: [10, 1, 5, 10, 20, 40, 50, 100, 200, 500, 1000, 2000, 3000, 5000, 10000],
    //   mirror: [0, 1],
    // };
    constructor(props) {
      Object.assign(this, props);
      this.init();
    }
    prepareOutput() {
      this.bestill_prepareOutput();
    }
    init() {
      this.stillf = [this.factor, this.factor, this.factor];
      let input = this.input;
      this.output = createImage(input.width, input.height);
      this.srcimage = createImage(this.output.width, this.output.height);
      this.buf = [];
      // console.log('eff_bestill stillf', this.stillf);
    }
    bestill_prepareOutput() {
      // console.log('bestill_render this', this);
      if (!this.inited) {
        this.buf_init();
        return;
      }
      let { output, srcimage, buf } = this;
      image_copy_to(srcimage, this.input);
      srcimage.loadPixels();
      output.loadPixels();
      let rf = this.stillf[0];
      let bf = this.stillf[1];
      let gf = this.stillf[2];
      let rm = rf - 1;
      let bm = bf - 1;
      let gm = gf - 1;
      let w = srcimage.width;
      let h = srcimage.height;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          let ii = (w * y + x) * 4;
          buf[ii + 0] = (buf[ii + 0] * rm + srcimage.pixels[ii + 0]) / rf;
          buf[ii + 1] = (buf[ii + 1] * bm + srcimage.pixels[ii + 1]) / bf;
          buf[ii + 2] = (buf[ii + 2] * gm + srcimage.pixels[ii + 2]) / gf;
          output.pixels[ii + 0] = buf[ii + 0];
          output.pixels[ii + 1] = buf[ii + 1];
          output.pixels[ii + 2] = buf[ii + 2];
          // output.pixels[ii + 3] = 255;
        }
      }
      output.updatePixels();
      // console.log('bestill_prepareOutput', output.pixels.length, output.pixels[1000]);
    }
    buf_init() {
      this.inited = 1;
      let { buf, output } = this;
      let w = output.width;
      let h = output.height;
      image_copy_to(output, this.input);
      output.loadPixels();
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          let ii = (w * y + x) * 4;
          buf[ii + 0] = output.pixels[ii + 0];
          buf[ii + 1] = output.pixels[ii + 1];
          buf[ii + 2] = output.pixels[ii + 2];
        }
      }
      // console.log('buf_init', w, h);
    }
  };
  window.eff_bestill = eff_bestill$1;

  //

  function draw_shape_layer$1(face, layer) {
    layer.clear();
    layer.fill([255, 255, 255, 255]);

    layer.beginShape();
    draw_vertex_layer(lips_out_top, face, layer);
    draw_vertex_layer(lips_out_bot, face, layer);
    layer.endShape();

    layer.beginShape();
    draw_vertex_layer(left_eye_top, face, layer);
    draw_vertex_layer(left_eye_bot, face, layer);
    layer.endShape();

    my.output.beginShape();
    draw_vertex_layer(right_eye_top, face, layer);
    draw_vertex_layer(right_eye_bot, face, layer);
    layer.endShape();
  }

  function draw_vertex_layer(lp, face, layer) {
    for (let i = 0; i < lp.length; i++) {
      let ki = lp[i];
      // let { x, y } = faceMesh_inputPtToOutput(face.keypoints[ki]);
      let { x, y } = face.keypoints[ki];
      layer.vertex(x, y);
    }
  }

  function draw_lips_line$1(face) {
    let colr = colorPalette[my.lipsOpenCount % colorPalette.length];

    my.output.strokeWeight(my.strokeWeightLips);
    my.output.stroke(colr);
    // my.output.stroke(255, 0, 0);
    draw_line(lips_out_top, face);

    // my.output.stroke(0, 255, 0);
    draw_line(lips_out_bot, face);

    // my.output.stroke(255, 255, 0);
    draw_line(lips_in_top, face);

    // my.output.stroke(0, 255, 255);
    draw_line(lips_in_bot, face);

    // draw_points_palette(face.lips.keypoints);
  }

  function draw_face_circle(face) {
    draw_points_palette(face.faceOval.keypoints);
  }

  function draw_points_palette(points) {
    my.output.strokeWeight(0);
    let index = my.lipsOpenCount;
    for (let point of points) {
      let { x, y } = faceMesh_inputPtToOutput(point);
      // my.output.fill(0, 255, 0);
      let colr = colorPalette[index % colorPalette.length];
      index++;
      my.output.fill(colr);
      my.output.circle(x, y, my.strokeWeight * 2);
    }
  }

  function draw_points(points) {
    for (let point of points) {
      let { x, y } = faceMesh_inputPtToOutput(point);
      my.output.fill(0, 255, 0);
      my.output.circle(x, y, my.strokeWeight);
    }
  }

  function draw_eye_shape$1(face) {
    my.output.strokeWeight(0);
    my.output.fill(0, 0, 0);

    my.output.beginShape();
    draw_vertex(left_eye_top, face);
    draw_vertex(left_eye_bot, face);
    my.output.endShape();

    my.output.beginShape();
    draw_vertex(right_eye_top, face);
    draw_vertex(right_eye_bot, face);
    my.output.endShape();
  }

  function draw_eye_lines$1(face) {
    // my.lipsOpenCount colorPalette
    let colr = colorPalette[my.lipsOpenCount % colorPalette.length];
    my.output.strokeWeight(my.strokeWeightEyes);
    my.output.stroke(colr);
    // my.output.stroke('gold');

    draw_line(left_eye_top, face);
    draw_line(left_eye_bot, face);
    draw_line(right_eye_top, face);
    draw_line(right_eye_bot, face);
  }

  function draw_mouth_shape$1(face) {
    my.output.fill(0, 0, 0);

    my.output.beginShape();
    draw_vertex(lips_in_top, face);
    draw_vertex(lips_in_bot, face);
    my.output.endShape();
  }

  function draw_vertex(lp, face) {
    for (let i = 0; i < lp.length; i++) {
      let ki = lp[i];
      let { x, y } = faceMesh_inputPtToOutput(face.keypoints[ki]);
      my.output.vertex(x, y);
    }
  }

  function draw_line(lp, face) {
    let px, py;
    for (let i = 0; i < lp.length; i++) {
      let ki = lp[i];
      let { x, y } = faceMesh_inputPtToOutput(face.keypoints[ki]);
      if (i != 0) {
        my.output.line(px, py, x, y);
      }
      px = x;
      py = y;
    }
  }

  function draw_face_mesh$1(face) {
    faceMesh_render(my, face.keypoints);
  }

  window.draw_face_mesh = draw_face_mesh$1;
  window.draw_mouth_shape = draw_mouth_shape$1;
  window.draw_lips_line = draw_lips_line$1;
  window.draw_eye_shape = draw_eye_shape$1;
  window.draw_eye_lines = draw_eye_lines$1;
  window.draw_shape_layer = draw_shape_layer$1;

  //
  function image_scaled_pad(img, urect, flush_right) {
    if (!urect) urect = { width, height, x0: 0, y0: 0 };
    let pw = urect.width;
    let ph = urect.height;
    let iw = img.width;
    let ih = img.height;
    let rr = ih / iw;
    if (ph == ih) {
      // If pad height matches image don't scale - for data-posenet
    } else if (rr < 1) {
      ph = pw * rr;
    } else {
      pw = ph / rr;
    }
    // console.log('urect.width', urect.width, 'iw', iw, 'ih', ih, 'pw', pw, 'ph', ph);
    // urect.width 270 iw 640 ih 480 pw 270 ph 480
    let dx = urect.x0;
    let dy = urect.y0;
    if (flush_right) {
      dx = dx + (urect.width - pw) / 2;
    }
    image(img, dx, dy, pw, ph, 0, 0, iw, ih);
  }

  // image(img, x, y, [width], [height])

  // image(img, dx, dy, dWidth, dHeight, sx, sy, [sWidth], [sHeight], [fit], [xAlign], [yAlign])

  // copies the image to the src at full dimensions
  function image_copy_to$1(to, from) {
    // console.log('image_copy to', to, 'from', from);
    // !!@ post p5js 1.8.0 in src/image/pixels.js/_copyHelper
    // loadPixels removed
    from.loadPixels();
    to.copy(from, 0, 0, from.width, from.height, 0, 0, to.width, to.height);
  }
  // image.copy(fromImage, sx, sy, sw, sh, dx, dy, dw, dh)

  window.image_copy_to = image_copy_to$1;

  //

  /*
  photo_meta 
    photo_index

  photo_store
    key 
      { uid, order, name, index, width, height }

  dbase_add_key( 'photo_store' ) --> key

  fstorage_upload({ path: key
    path = key/name
  */

  // my.photo_list = [ { } ]
  // {
  //   "index": 19,
  //   "name": "019.jpg",
  //   "uid": "DK1Lcj16BFhDPgdvGGkVP9FS3Xy2"
  // }

  function photo_path_entry(entry) {
    // return entry.key + '/' + entry.uid + '/' + entry.name;
    // return `${entry.order}/${entry.key}/${entry.uid}/${entry.name}`;
    return `${entry.key}/${entry.name}`;
  }

  function photo_new_entry(index) {
    let order = index.toString().padStart(4, '0');
    let name = order + my.imageExt;
    let uid = my.uid;
    let color = my.avg_color;
    let createdAt = new Date().toISOString();
    return { uid, name, index, width, height, color, createdAt };
  }

  async function photo_list_remove_entry(entry) {
    // console.log('photo_list_remove_entry entry', entry);
    let path = photo_path_entry(entry);
    try {
      await fstorage_remove({ path });
      await dbase_remove_key('photo_store', entry.key);
    } catch (err) {
      console.log('photo_list_remove_entry err', err);
    }
  }

  function photo_list_update$1() {
    console.log('photo_list_update photo_list_update_pending = 1', my.photo_list_update_enabled);
    scroller_pause();
    my.photo_list_update_pending = 1;
  }

  function photo_list_update_poll$1() {
    if (my.photo_list_update_pending && my.photo_list_update_enabled) {
      console.log('photo_list_update_poll photo_list_render');
      photo_list_render();
    }
  }

  async function photo_list_render() {
    console.log('photo_list_update my.photo_list_render_active', my.photo_list_render_active);
    // Create images from my.photo_store
    // showing most recent first
    //
    my.photo_list_update_pending = 0;

    my.photo_list_render_active = 1;

    let prepend = 1;
    let entries = Object.entries(my.photo_store);
    let nnew = entries.length;
    let nold = my.photo_list.length;
    console.log('photo_list_render nold', nold, 'nnew', nnew);
    if (nold == 0) {
      // Render list most recent first by appending
      console.log('photo_list_render prepend = 0 nnew', nnew);
      prepend = 0;
    }
    let photo_list = [];
    let istart = nnew - my.photo_max;
    if (istart < 0) istart = 0;
    for (let i = istart; i < nnew; i++) {
      let ent = entries[i];
      let key = ent[0];
      let photo = ent[1];
      photo.key = key;
      photo_list.push(photo);
    }
    if (!prepend) {
      photo_list.reverse();
    }
    // console.log('photo_list_render my.photo_list', my.photo_list);
    console.log('photo_list_render photo_path_entry for n', photo_list.length);
    for (let entry of photo_list) {
      let present = locate_img_key(entry.key);
      if (present) {
        // console.log('photo_list_render present', entry.key);
        continue;
      }
      let path = photo_path_entry(entry);
      try {
        let url = await fstorage_download_url({ path });
        url_result(url, entry.key);
      } catch (err) {
        console.log('photo_list_update err', err);
      }
    }
    function url_result(url, key) {
      // console.log('url_result index', index, 'url', url);
      // Images are prepended
      let img = find_img(key, prepend);
      img.elt.src = url;
    }

    add_action_stopLoader();

    // Correct photo_list order
    if (!prepend) {
      photo_list.reverse();
    }
    my.photo_list = photo_list;
    my.photo_list_render_active = 0;
    console.log('photo_list_render exit\n');
  }

  function proto_prune_poll$1() {
    if (my.photo_prune_pending) {
      my.photo_prune_pending = 0;
      photo_list_prune();
    }
  }
  function photo_list_prune() {
    let photos_present = {};
    for (let entry of my.photo_list) {
      photos_present[entry.key] = 1;
    }
    for (let key in my.gallery_items) {
      let span = my.gallery_items[key];
      if (!photos_present[key]) {
        console.log('photo_list_update remove key', key);
        span.remove();
        delete my.gallery_items[key];
      }
    }
  }

  async function add_action$1() {
    console.log('add_action my.photo_list_update_enabled', my.photo_list_update_enabled);

    my.photo_list_update_enabled = 1;

    add_action_startLoader();

    let entry = photo_new_entry(my.photo_index + 1);

    let layer = my.canvas;
    let imageQuality = my.imageQuality;

    let key = await dbase_add_key('photo_store', entry);
    // console.log('add_action key', key);
    // console.log('add_action result.key', result.key);
    entry.key = key;
    let path = photo_path_entry(entry);

    try {
      await fstorage_upload({ path, layer, imageQuality });
      dbase_update_item({ photo_index: dbase_increment(1) }, 'item');
    } catch (err) {
      console.log('take_action err', err);
    }
  }

  async function take_action$1() {
    // console.log('take_action');
    // let n = my.photo_list.length;
    // remove_action();
    add_action$1();
  }

  async function remove_action$1() {
    let response = confirm('remove photo ' + my.photo_index);
    if (response) {
      remove_action_confirmed();
    }
  }

  async function remove_action_confirmed() {
    console.log('remove_action photo_count', my.photo_list.length);
    let n = my.photo_list.length;
    if (n < 1) {
      // No more images in the cloud
      //  zero out photo_index
      dbase_update_item({ photo_index: 0 }, 'item');
      return;
    }
    startLoader();

    // Remove first on screen
    let photo = my.photo_list[n - 1];
    await photo_list_remove_entry(photo);

    // setTimeout(photo_list_prune, 2000);

    stopLoader();
  }

  async function remove_all_action$1() {
    let response = confirm('remove all photos n=' + my.photo_list.length);
    if (response) {
      remove_all_action_confirmed();
    }
  }

  async function remove_all_action_confirmed() {
    //
    startLoader();

    for (let photo of my.photo_list) {
      await photo_list_remove_entry(photo);
    }
    // zero out photo_index
    dbase_update_item({ photo_index: 0 }, 'item');

    stopLoader();

    // setTimeout(photo_list_prune, 2000);
  }

  window.add_action = add_action$1;
  window.take_action = take_action$1;
  window.remove_action = remove_action$1;
  window.remove_all_action = remove_all_action$1;
  window.photo_list_update = photo_list_update$1;
  window.photo_list_update_poll = photo_list_update_poll$1;
  window.proto_prune_poll = proto_prune_poll$1;

  //

  // !!@ flipH=true does not preview correctly
  // unless capture is sized immediately
  window.flipH = true;
  // let flipH = false;

  async function video_init$1() {
    //
    await mediaDevices_preflight();

    await video_init_capture();
  }

  // Create the webcam video and hide it
  //
  async function video_init_capture() {
    // console.log('video_init_capture enter');
    //
    await mediaDevices_enum();

    if (!my.mediaDevices.length) {
      console.log('video_init_capture No my.mediaDevices');
      return;
    }

    let mediaDev = my.mediaDevices[0];

    let videoCapture = await mediaDevice_create_capture(mediaDev, { flipped: flipH });
    my.video = videoCapture.capture;

    my.video.hide();

    console.log('video_init_capture my.video.width, my.video.height', my.video.width, my.video.height);

    video_init_mask();
  }

  function video_init_mask() {
    let { width, height } = my.video;
    my.videoMask = createGraphics(width, height);
    my.videoBuff = createGraphics(width, height);
  }

  function overlayEyesMouth$1() {
    overlayEyesMouthFace(my.face1, my.video);
  }

  function overlayEyesMouthBars$1() {
    my.bars.prepareOutput();
    let source = my.bars.output.get();
    overlayEyesMouthFace(my.face1, source);
  }

  function overlayEyesMouthFace(face, source) {
    if (!face) return;

    draw_shape_layer(face, my.videoMask);
    source.mask(my.videoMask);

    let xlen = my.videoBuff.width;
    let ylen = my.videoBuff.height;
    let { x: x0, y: y0 } = faceMesh_outputPtToInput({ x: 0, y: 0 });
    my.videoBuff.clear();
    my.videoBuff.image(source, 0, 0, xlen, ylen, x0, y0, xlen, ylen);

    let w = xlen * my.rx;
    let h = ylen * my.ry;
    image(my.videoBuff, 0, 0, w, h, 0, 0, xlen, ylen);
    // console.log('x0, y0, w, h', x0, y0, w, h);
  }

  // image(img, dx, dy, dWidth, dHeight, sx, sy, [sWidth], [sHeight]

  window.video_init = video_init$1;
  window.overlayEyesMouth = overlayEyesMouth$1;
  window.overlayEyesMouthBars = overlayEyesMouthBars$1;

  // let capture = createCapture(VIDEO, function (stream)
  // try {
  // } catch (err) {
  //   console.log('init_device_capture err', err);
  //   alert('init_device_capture err=' + err);
  // }

  //
  window.left_eye_bot = [263, 249, 390, 373, 374, 380, 381, 382, 362];

  window.left_eye_top = [263, 466, 388, 387, 386, 385, 384, 398, 362];

  window.right_eye_bot = [33, 7, 163, 144, 145, 153, 154, 155, 133];

  window.right_eye_top = [33, 246, 161, 160, 159, 158, 157, 173, 133];

  /*

  https://github.com/tensorflow/tfjs-models/tree/master/face-landmarks-detection

  https://github.com/tensorflow/tfjs-models/blob/master/face-landmarks-detection/src/constants.ts

  export const MEDIAPIPE_FACE_MESH_CONNECTED_KEYPOINTS_PAIRS: PairArray = [
    [127, 34],  [34, 139],  [139, 127], [11, 0],    [0, 37],    [37, 11],

  */

  // console.log('FACE_MESH_PAIRS');

  // const MEDIAPIPE_FACE_MESH_CONNECTED_KEYPOINTS_PAIRS = [
  window.FACE_MESH_PAIRS = [
    [127, 34],
    [34, 139],
    [139, 127],
    [11, 0],
    [0, 37],
    [37, 11],
    [232, 231],
    [231, 120],
    [120, 232],
    [72, 37],
    [37, 39],
    [39, 72],
    [128, 121],
    [121, 47],
    [47, 128],
    [232, 121],
    [121, 128],
    [128, 232],
    [104, 69],
    [69, 67],
    [67, 104],
    [175, 171],
    [171, 148],
    [148, 175],
    [118, 50],
    [50, 101],
    [101, 118],
    [73, 39],
    [39, 40],
    [40, 73],
    [9, 151],
    [151, 108],
    [108, 9],
    [48, 115],
    [115, 131],
    [131, 48],
    [194, 204],
    [204, 211],
    [211, 194],
    [74, 40],
    [40, 185],
    [185, 74],
    [80, 42],
    [42, 183],
    [183, 80],
    [40, 92],
    [92, 186],
    [186, 40],
    [230, 229],
    [229, 118],
    [118, 230],
    [202, 212],
    [212, 214],
    [214, 202],
    [83, 18],
    [18, 17],
    [17, 83],
    [76, 61],
    [61, 146],
    [146, 76],
    [160, 29],
    [29, 30],
    [30, 160],
    [56, 157],
    [157, 173],
    [173, 56],
    [106, 204],
    [204, 194],
    [194, 106],
    [135, 214],
    [214, 192],
    [192, 135],
    [203, 165],
    [165, 98],
    [98, 203],
    [21, 71],
    [71, 68],
    [68, 21],
    [51, 45],
    [45, 4],
    [4, 51],
    [144, 24],
    [24, 23],
    [23, 144],
    [77, 146],
    [146, 91],
    [91, 77],
    [205, 50],
    [50, 187],
    [187, 205],
    [201, 200],
    [200, 18],
    [18, 201],
    [91, 106],
    [106, 182],
    [182, 91],
    [90, 91],
    [91, 181],
    [181, 90],
    [85, 84],
    [84, 17],
    [17, 85],
    [206, 203],
    [203, 36],
    [36, 206],
    [148, 171],
    [171, 140],
    [140, 148],
    [92, 40],
    [40, 39],
    [39, 92],
    [193, 189],
    [189, 244],
    [244, 193],
    [159, 158],
    [158, 28],
    [28, 159],
    [247, 246],
    [246, 161],
    [161, 247],
    [236, 3],
    [3, 196],
    [196, 236],
    [54, 68],
    [68, 104],
    [104, 54],
    [193, 168],
    [168, 8],
    [8, 193],
    [117, 228],
    [228, 31],
    [31, 117],
    [189, 193],
    [193, 55],
    [55, 189],
    [98, 97],
    [97, 99],
    [99, 98],
    [126, 47],
    [47, 100],
    [100, 126],
    [166, 79],
    [79, 218],
    [218, 166],
    [155, 154],
    [154, 26],
    [26, 155],
    [209, 49],
    [49, 131],
    [131, 209],
    [135, 136],
    [136, 150],
    [150, 135],
    [47, 126],
    [126, 217],
    [217, 47],
    [223, 52],
    [52, 53],
    [53, 223],
    [45, 51],
    [51, 134],
    [134, 45],
    [211, 170],
    [170, 140],
    [140, 211],
    [67, 69],
    [69, 108],
    [108, 67],
    [43, 106],
    [106, 91],
    [91, 43],
    [230, 119],
    [119, 120],
    [120, 230],
    [226, 130],
    [130, 247],
    [247, 226],
    [63, 53],
    [53, 52],
    [52, 63],
    [238, 20],
    [20, 242],
    [242, 238],
    [46, 70],
    [70, 156],
    [156, 46],
    [78, 62],
    [62, 96],
    [96, 78],
    [46, 53],
    [53, 63],
    [63, 46],
    [143, 34],
    [34, 227],
    [227, 143],
    [123, 117],
    [117, 111],
    [111, 123],
    [44, 125],
    [125, 19],
    [19, 44],
    [236, 134],
    [134, 51],
    [51, 236],
    [216, 206],
    [206, 205],
    [205, 216],
    [154, 153],
    [153, 22],
    [22, 154],
    [39, 37],
    [37, 167],
    [167, 39],
    [200, 201],
    [201, 208],
    [208, 200],
    [36, 142],
    [142, 100],
    [100, 36],
    [57, 212],
    [212, 202],
    [202, 57],
    [20, 60],
    [60, 99],
    [99, 20],
    [28, 158],
    [158, 157],
    [157, 28],
    [35, 226],
    [226, 113],
    [113, 35],
    [160, 159],
    [159, 27],
    [27, 160],
    [204, 202],
    [202, 210],
    [210, 204],
    [113, 225],
    [225, 46],
    [46, 113],
    [43, 202],
    [202, 204],
    [204, 43],
    [62, 76],
    [76, 77],
    [77, 62],
    [137, 123],
    [123, 116],
    [116, 137],
    [41, 38],
    [38, 72],
    [72, 41],
    [203, 129],
    [129, 142],
    [142, 203],
    [64, 98],
    [98, 240],
    [240, 64],
    [49, 102],
    [102, 64],
    [64, 49],
    [41, 73],
    [73, 74],
    [74, 41],
    [212, 216],
    [216, 207],
    [207, 212],
    [42, 74],
    [74, 184],
    [184, 42],
    [169, 170],
    [170, 211],
    [211, 169],
    [170, 149],
    [149, 176],
    [176, 170],
    [105, 66],
    [66, 69],
    [69, 105],
    [122, 6],
    [6, 168],
    [168, 122],
    [123, 147],
    [147, 187],
    [187, 123],
    [96, 77],
    [77, 90],
    [90, 96],
    [65, 55],
    [55, 107],
    [107, 65],
    [89, 90],
    [90, 180],
    [180, 89],
    [101, 100],
    [100, 120],
    [120, 101],
    [63, 105],
    [105, 104],
    [104, 63],
    [93, 137],
    [137, 227],
    [227, 93],
    [15, 86],
    [86, 85],
    [85, 15],
    [129, 102],
    [102, 49],
    [49, 129],
    [14, 87],
    [87, 86],
    [86, 14],
    [55, 8],
    [8, 9],
    [9, 55],
    [100, 47],
    [47, 121],
    [121, 100],
    [145, 23],
    [23, 22],
    [22, 145],
    [88, 89],
    [89, 179],
    [179, 88],
    [6, 122],
    [122, 196],
    [196, 6],
    [88, 95],
    [95, 96],
    [96, 88],
    [138, 172],
    [172, 136],
    [136, 138],
    [215, 58],
    [58, 172],
    [172, 215],
    [115, 48],
    [48, 219],
    [219, 115],
    [42, 80],
    [80, 81],
    [81, 42],
    [195, 3],
    [3, 51],
    [51, 195],
    [43, 146],
    [146, 61],
    [61, 43],
    [171, 175],
    [175, 199],
    [199, 171],
    [81, 82],
    [82, 38],
    [38, 81],
    [53, 46],
    [46, 225],
    [225, 53],
    [144, 163],
    [163, 110],
    [110, 144],
    [52, 65],
    [65, 66],
    [66, 52],
    [229, 228],
    [228, 117],
    [117, 229],
    [34, 127],
    [127, 234],
    [234, 34],
    [107, 108],
    [108, 69],
    [69, 107],
    [109, 108],
    [108, 151],
    [151, 109],
    [48, 64],
    [64, 235],
    [235, 48],
    [62, 78],
    [78, 191],
    [191, 62],
    [129, 209],
    [209, 126],
    [126, 129],
    [111, 35],
    [35, 143],
    [143, 111],
    [117, 123],
    [123, 50],
    [50, 117],
    [222, 65],
    [65, 52],
    [52, 222],
    [19, 125],
    [125, 141],
    [141, 19],
    [221, 55],
    [55, 65],
    [65, 221],
    [3, 195],
    [195, 197],
    [197, 3],
    [25, 7],
    [7, 33],
    [33, 25],
    [220, 237],
    [237, 44],
    [44, 220],
    [70, 71],
    [71, 139],
    [139, 70],
    [122, 193],
    [193, 245],
    [245, 122],
    [247, 130],
    [130, 33],
    [33, 247],
    [71, 21],
    [21, 162],
    [162, 71],
    [170, 169],
    [169, 150],
    [150, 170],
    [188, 174],
    [174, 196],
    [196, 188],
    [216, 186],
    [186, 92],
    [92, 216],
    [2, 97],
    [97, 167],
    [167, 2],
    [141, 125],
    [125, 241],
    [241, 141],
    [164, 167],
    [167, 37],
    [37, 164],
    [72, 38],
    [38, 12],
    [12, 72],
    [38, 82],
    [82, 13],
    [13, 38],
    [63, 68],
    [68, 71],
    [71, 63],
    [226, 35],
    [35, 111],
    [111, 226],
    [101, 50],
    [50, 205],
    [205, 101],
    [206, 92],
    [92, 165],
    [165, 206],
    [209, 198],
    [198, 217],
    [217, 209],
    [165, 167],
    [167, 97],
    [97, 165],
    [220, 115],
    [115, 218],
    [218, 220],
    [133, 112],
    [112, 243],
    [243, 133],
    [239, 238],
    [238, 241],
    [241, 239],
    [214, 135],
    [135, 169],
    [169, 214],
    [190, 173],
    [173, 133],
    [133, 190],
    [171, 208],
    [208, 32],
    [32, 171],
    [125, 44],
    [44, 237],
    [237, 125],
    [86, 87],
    [87, 178],
    [178, 86],
    [85, 86],
    [86, 179],
    [179, 85],
    [84, 85],
    [85, 180],
    [180, 84],
    [83, 84],
    [84, 181],
    [181, 83],
    [201, 83],
    [83, 182],
    [182, 201],
    [137, 93],
    [93, 132],
    [132, 137],
    [76, 62],
    [62, 183],
    [183, 76],
    [61, 76],
    [76, 184],
    [184, 61],
    [57, 61],
    [61, 185],
    [185, 57],
    [212, 57],
    [57, 186],
    [186, 212],
    [214, 207],
    [207, 187],
    [187, 214],
    [34, 143],
    [143, 156],
    [156, 34],
    [79, 239],
    [239, 237],
    [237, 79],
    [123, 137],
    [137, 177],
    [177, 123],
    [44, 1],
    [1, 4],
    [4, 44],
    [201, 194],
    [194, 32],
    [32, 201],
    [64, 102],
    [102, 129],
    [129, 64],
    [213, 215],
    [215, 138],
    [138, 213],
    [59, 166],
    [166, 219],
    [219, 59],
    [242, 99],
    [99, 97],
    [97, 242],
    [2, 94],
    [94, 141],
    [141, 2],
    [75, 59],
    [59, 235],
    [235, 75],
    [24, 110],
    [110, 228],
    [228, 24],
    [25, 130],
    [130, 226],
    [226, 25],
    [23, 24],
    [24, 229],
    [229, 23],
    [22, 23],
    [23, 230],
    [230, 22],
    [26, 22],
    [22, 231],
    [231, 26],
    [112, 26],
    [26, 232],
    [232, 112],
    [189, 190],
    [190, 243],
    [243, 189],
    [221, 56],
    [56, 190],
    [190, 221],
    [28, 56],
    [56, 221],
    [221, 28],
    [27, 28],
    [28, 222],
    [222, 27],
    [29, 27],
    [27, 223],
    [223, 29],
    [30, 29],
    [29, 224],
    [224, 30],
    [247, 30],
    [30, 225],
    [225, 247],
    [238, 79],
    [79, 20],
    [20, 238],
    [166, 59],
    [59, 75],
    [75, 166],
    [60, 75],
    [75, 240],
    [240, 60],
    [147, 177],
    [177, 215],
    [215, 147],
    [20, 79],
    [79, 166],
    [166, 20],
    [187, 147],
    [147, 213],
    [213, 187],
    [112, 233],
    [233, 244],
    [244, 112],
    [233, 128],
    [128, 245],
    [245, 233],
    [128, 114],
    [114, 188],
    [188, 128],
    [114, 217],
    [217, 174],
    [174, 114],
    [131, 115],
    [115, 220],
    [220, 131],
    [217, 198],
    [198, 236],
    [236, 217],
    [198, 131],
    [131, 134],
    [134, 198],
    [177, 132],
    [132, 58],
    [58, 177],
    [143, 35],
    [35, 124],
    [124, 143],
    [110, 163],
    [163, 7],
    [7, 110],
    [228, 110],
    [110, 25],
    [25, 228],
    [356, 389],
    [389, 368],
    [368, 356],
    [11, 302],
    [302, 267],
    [267, 11],
    [452, 350],
    [350, 349],
    [349, 452],
    [302, 303],
    [303, 269],
    [269, 302],
    [357, 343],
    [343, 277],
    [277, 357],
    [452, 453],
    [453, 357],
    [357, 452],
    [333, 332],
    [332, 297],
    [297, 333],
    [175, 152],
    [152, 377],
    [377, 175],
    [347, 348],
    [348, 330],
    [330, 347],
    [303, 304],
    [304, 270],
    [270, 303],
    [9, 336],
    [336, 337],
    [337, 9],
    [278, 279],
    [279, 360],
    [360, 278],
    [418, 262],
    [262, 431],
    [431, 418],
    [304, 408],
    [408, 409],
    [409, 304],
    [310, 415],
    [415, 407],
    [407, 310],
    [270, 409],
    [409, 410],
    [410, 270],
    [450, 348],
    [348, 347],
    [347, 450],
    [422, 430],
    [430, 434],
    [434, 422],
    [313, 314],
    [314, 17],
    [17, 313],
    [306, 307],
    [307, 375],
    [375, 306],
    [387, 388],
    [388, 260],
    [260, 387],
    [286, 414],
    [414, 398],
    [398, 286],
    [335, 406],
    [406, 418],
    [418, 335],
    [364, 367],
    [367, 416],
    [416, 364],
    [423, 358],
    [358, 327],
    [327, 423],
    [251, 284],
    [284, 298],
    [298, 251],
    [281, 5],
    [5, 4],
    [4, 281],
    [373, 374],
    [374, 253],
    [253, 373],
    [307, 320],
    [320, 321],
    [321, 307],
    [425, 427],
    [427, 411],
    [411, 425],
    [421, 313],
    [313, 18],
    [18, 421],
    [321, 405],
    [405, 406],
    [406, 321],
    [320, 404],
    [404, 405],
    [405, 320],
    [315, 16],
    [16, 17],
    [17, 315],
    [426, 425],
    [425, 266],
    [266, 426],
    [377, 400],
    [400, 369],
    [369, 377],
    [322, 391],
    [391, 269],
    [269, 322],
    [417, 465],
    [465, 464],
    [464, 417],
    [386, 257],
    [257, 258],
    [258, 386],
    [466, 260],
    [260, 388],
    [388, 466],
    [456, 399],
    [399, 419],
    [419, 456],
    [284, 332],
    [332, 333],
    [333, 284],
    [417, 285],
    [285, 8],
    [8, 417],
    [346, 340],
    [340, 261],
    [261, 346],
    [413, 441],
    [441, 285],
    [285, 413],
    [327, 460],
    [460, 328],
    [328, 327],
    [355, 371],
    [371, 329],
    [329, 355],
    [392, 439],
    [439, 438],
    [438, 392],
    [382, 341],
    [341, 256],
    [256, 382],
    [429, 420],
    [420, 360],
    [360, 429],
    [364, 394],
    [394, 379],
    [379, 364],
    [277, 343],
    [343, 437],
    [437, 277],
    [443, 444],
    [444, 283],
    [283, 443],
    [275, 440],
    [440, 363],
    [363, 275],
    [431, 262],
    [262, 369],
    [369, 431],
    [297, 338],
    [338, 337],
    [337, 297],
    [273, 375],
    [375, 321],
    [321, 273],
    [450, 451],
    [451, 349],
    [349, 450],
    [446, 342],
    [342, 467],
    [467, 446],
    [293, 334],
    [334, 282],
    [282, 293],
    [458, 461],
    [461, 462],
    [462, 458],
    [276, 353],
    [353, 383],
    [383, 276],
    [308, 324],
    [324, 325],
    [325, 308],
    [276, 300],
    [300, 293],
    [293, 276],
    [372, 345],
    [345, 447],
    [447, 372],
    [352, 345],
    [345, 340],
    [340, 352],
    [274, 1],
    [1, 19],
    [19, 274],
    [456, 248],
    [248, 281],
    [281, 456],
    [436, 427],
    [427, 425],
    [425, 436],
    [381, 256],
    [256, 252],
    [252, 381],
    [269, 391],
    [391, 393],
    [393, 269],
    [200, 199],
    [199, 428],
    [428, 200],
    [266, 330],
    [330, 329],
    [329, 266],
    [287, 273],
    [273, 422],
    [422, 287],
    [250, 462],
    [462, 328],
    [328, 250],
    [258, 286],
    [286, 384],
    [384, 258],
    [265, 353],
    [353, 342],
    [342, 265],
    [387, 259],
    [259, 257],
    [257, 387],
    [424, 431],
    [431, 430],
    [430, 424],
    [342, 353],
    [353, 276],
    [276, 342],
    [273, 335],
    [335, 424],
    [424, 273],
    [292, 325],
    [325, 307],
    [307, 292],
    [366, 447],
    [447, 345],
    [345, 366],
    [271, 303],
    [303, 302],
    [302, 271],
    [423, 266],
    [266, 371],
    [371, 423],
    [294, 455],
    [455, 460],
    [460, 294],
    [279, 278],
    [278, 294],
    [294, 279],
    [271, 272],
    [272, 304],
    [304, 271],
    [432, 434],
    [434, 427],
    [427, 432],
    [272, 407],
    [407, 408],
    [408, 272],
    [394, 430],
    [430, 431],
    [431, 394],
    [395, 369],
    [369, 400],
    [400, 395],
    [334, 333],
    [333, 299],
    [299, 334],
    [351, 417],
    [417, 168],
    [168, 351],
    [352, 280],
    [280, 411],
    [411, 352],
    [325, 319],
    [319, 320],
    [320, 325],
    [295, 296],
    [296, 336],
    [336, 295],
    [319, 403],
    [403, 404],
    [404, 319],
    [330, 348],
    [348, 349],
    [349, 330],
    [293, 298],
    [298, 333],
    [333, 293],
    [323, 454],
    [454, 447],
    [447, 323],
    [15, 16],
    [16, 315],
    [315, 15],
    [358, 429],
    [429, 279],
    [279, 358],
    [14, 15],
    [15, 316],
    [316, 14],
    [285, 336],
    [336, 9],
    [9, 285],
    [329, 349],
    [349, 350],
    [350, 329],
    [374, 380],
    [380, 252],
    [252, 374],
    [318, 402],
    [402, 403],
    [403, 318],
    [6, 197],
    [197, 419],
    [419, 6],
    [318, 319],
    [319, 325],
    [325, 318],
    [367, 364],
    [364, 365],
    [365, 367],
    [435, 367],
    [367, 397],
    [397, 435],
    [344, 438],
    [438, 439],
    [439, 344],
    [272, 271],
    [271, 311],
    [311, 272],
    [195, 5],
    [5, 281],
    [281, 195],
    [273, 287],
    [287, 291],
    [291, 273],
    [396, 428],
    [428, 199],
    [199, 396],
    [311, 271],
    [271, 268],
    [268, 311],
    [283, 444],
    [444, 445],
    [445, 283],
    [373, 254],
    [254, 339],
    [339, 373],
    [282, 334],
    [334, 296],
    [296, 282],
    [449, 347],
    [347, 346],
    [346, 449],
    [264, 447],
    [447, 454],
    [454, 264],
    [336, 296],
    [296, 299],
    [299, 336],
    [338, 10],
    [10, 151],
    [151, 338],
    [278, 439],
    [439, 455],
    [455, 278],
    [292, 407],
    [407, 415],
    [415, 292],
    [358, 371],
    [371, 355],
    [355, 358],
    [340, 345],
    [345, 372],
    [372, 340],
    [346, 347],
    [347, 280],
    [280, 346],
    [442, 443],
    [443, 282],
    [282, 442],
    [19, 94],
    [94, 370],
    [370, 19],
    [441, 442],
    [442, 295],
    [295, 441],
    [248, 419],
    [419, 197],
    [197, 248],
    [263, 255],
    [255, 359],
    [359, 263],
    [440, 275],
    [275, 274],
    [274, 440],
    [300, 383],
    [383, 368],
    [368, 300],
    [351, 412],
    [412, 465],
    [465, 351],
    [263, 467],
    [467, 466],
    [466, 263],
    [301, 368],
    [368, 389],
    [389, 301],
    [395, 378],
    [378, 379],
    [379, 395],
    [412, 351],
    [351, 419],
    [419, 412],
    [436, 426],
    [426, 322],
    [322, 436],
    [2, 164],
    [164, 393],
    [393, 2],
    [370, 462],
    [462, 461],
    [461, 370],
    [164, 0],
    [0, 267],
    [267, 164],
    [302, 11],
    [11, 12],
    [12, 302],
    [268, 12],
    [12, 13],
    [13, 268],
    [293, 300],
    [300, 301],
    [301, 293],
    [446, 261],
    [261, 340],
    [340, 446],
    [330, 266],
    [266, 425],
    [425, 330],
    [426, 423],
    [423, 391],
    [391, 426],
    [429, 355],
    [355, 437],
    [437, 429],
    [391, 327],
    [327, 326],
    [326, 391],
    [440, 457],
    [457, 438],
    [438, 440],
    [341, 382],
    [382, 362],
    [362, 341],
    [459, 457],
    [457, 461],
    [461, 459],
    [434, 430],
    [430, 394],
    [394, 434],
    [414, 463],
    [463, 362],
    [362, 414],
    [396, 369],
    [369, 262],
    [262, 396],
    [354, 461],
    [461, 457],
    [457, 354],
    [316, 403],
    [403, 402],
    [402, 316],
    [315, 404],
    [404, 403],
    [403, 315],
    [314, 405],
    [405, 404],
    [404, 314],
    [313, 406],
    [406, 405],
    [405, 313],
    [421, 418],
    [418, 406],
    [406, 421],
    [366, 401],
    [401, 361],
    [361, 366],
    [306, 408],
    [408, 407],
    [407, 306],
    [291, 409],
    [409, 408],
    [408, 291],
    [287, 410],
    [410, 409],
    [409, 287],
    [432, 436],
    [436, 410],
    [410, 432],
    [434, 416],
    [416, 411],
    [411, 434],
    [264, 368],
    [368, 383],
    [383, 264],
    [309, 438],
    [438, 457],
    [457, 309],
    [352, 376],
    [376, 401],
    [401, 352],
    [274, 275],
    [275, 4],
    [4, 274],
    [421, 428],
    [428, 262],
    [262, 421],
    [294, 327],
    [327, 358],
    [358, 294],
    [433, 416],
    [416, 367],
    [367, 433],
    [289, 455],
    [455, 439],
    [439, 289],
    [462, 370],
    [370, 326],
    [326, 462],
    [2, 326],
    [326, 370],
    [370, 2],
    [305, 460],
    [460, 455],
    [455, 305],
    [254, 449],
    [449, 448],
    [448, 254],
    [255, 261],
    [261, 446],
    [446, 255],
    [253, 450],
    [450, 449],
    [449, 253],
    [252, 451],
    [451, 450],
    [450, 252],
    [256, 452],
    [452, 451],
    [451, 256],
    [341, 453],
    [453, 452],
    [452, 341],
    [413, 464],
    [464, 463],
    [463, 413],
    [441, 413],
    [413, 414],
    [414, 441],
    [258, 442],
    [442, 441],
    [441, 258],
    [257, 443],
    [443, 442],
    [442, 257],
    [259, 444],
    [444, 443],
    [443, 259],
    [260, 445],
    [445, 444],
    [444, 260],
    [467, 342],
    [342, 445],
    [445, 467],
    [459, 458],
    [458, 250],
    [250, 459],
    [289, 392],
    [392, 290],
    [290, 289],
    [290, 328],
    [328, 460],
    [460, 290],
    [376, 433],
    [433, 435],
    [435, 376],
    [250, 290],
    [290, 392],
    [392, 250],
    [411, 416],
    [416, 433],
    [433, 411],
    [341, 463],
    [463, 464],
    [464, 341],
    [453, 464],
    [464, 465],
    [465, 453],
    [357, 465],
    [465, 412],
    [412, 357],
    [343, 412],
    [412, 399],
    [399, 343],
    [360, 363],
    [363, 440],
    [440, 360],
    [437, 399],
    [399, 456],
    [456, 437],
    [420, 456],
    [456, 363],
    [363, 420],
    [401, 435],
    [435, 288],
    [288, 401],
    [372, 383],
    [383, 353],
    [353, 372],
    [339, 255],
    [255, 249],
    [249, 339],
    [448, 261],
    [261, 255],
    [255, 448],
    [133, 243],
    [243, 190],
    [190, 133],
    [133, 155],
    [155, 112],
    [112, 133],
    [33, 246],
    [246, 247],
    [247, 33],
    [33, 130],
    [130, 25],
    [25, 33],
    [398, 384],
    [384, 286],
    [286, 398],
    [362, 398],
    [398, 414],
    [414, 362],
    [362, 463],
    [463, 341],
    [341, 362],
    [263, 359],
    [359, 467],
    [467, 263],
    [263, 249],
    [249, 255],
    [255, 263],
    [466, 467],
    [467, 260],
    [260, 466],
    [75, 60],
    [60, 166],
    [166, 75],
    [238, 239],
    [239, 79],
    [79, 238],
    [162, 127],
    [127, 139],
    [139, 162],
    [72, 11],
    [11, 37],
    [37, 72],
    [121, 232],
    [232, 120],
    [120, 121],
    [73, 72],
    [72, 39],
    [39, 73],
    [114, 128],
    [128, 47],
    [47, 114],
    [233, 232],
    [232, 128],
    [128, 233],
    [103, 104],
    [104, 67],
    [67, 103],
    [152, 175],
    [175, 148],
    [148, 152],
    [119, 118],
    [118, 101],
    [101, 119],
    [74, 73],
    [73, 40],
    [40, 74],
    [107, 9],
    [9, 108],
    [108, 107],
    [49, 48],
    [48, 131],
    [131, 49],
    [32, 194],
    [194, 211],
    [211, 32],
    [184, 74],
    [74, 185],
    [185, 184],
    [191, 80],
    [80, 183],
    [183, 191],
    [185, 40],
    [40, 186],
    [186, 185],
    [119, 230],
    [230, 118],
    [118, 119],
    [210, 202],
    [202, 214],
    [214, 210],
    [84, 83],
    [83, 17],
    [17, 84],
    [77, 76],
    [76, 146],
    [146, 77],
    [161, 160],
    [160, 30],
    [30, 161],
    [190, 56],
    [56, 173],
    [173, 190],
    [182, 106],
    [106, 194],
    [194, 182],
    [138, 135],
    [135, 192],
    [192, 138],
    [129, 203],
    [203, 98],
    [98, 129],
    [54, 21],
    [21, 68],
    [68, 54],
    [5, 51],
    [51, 4],
    [4, 5],
    [145, 144],
    [144, 23],
    [23, 145],
    [90, 77],
    [77, 91],
    [91, 90],
    [207, 205],
    [205, 187],
    [187, 207],
    [83, 201],
    [201, 18],
    [18, 83],
    [181, 91],
    [91, 182],
    [182, 181],
    [180, 90],
    [90, 181],
    [181, 180],
    [16, 85],
    [85, 17],
    [17, 16],
    [205, 206],
    [206, 36],
    [36, 205],
    [176, 148],
    [148, 140],
    [140, 176],
    [165, 92],
    [92, 39],
    [39, 165],
    [245, 193],
    [193, 244],
    [244, 245],
    [27, 159],
    [159, 28],
    [28, 27],
    [30, 247],
    [247, 161],
    [161, 30],
    [174, 236],
    [236, 196],
    [196, 174],
    [103, 54],
    [54, 104],
    [104, 103],
    [55, 193],
    [193, 8],
    [8, 55],
    [111, 117],
    [117, 31],
    [31, 111],
    [221, 189],
    [189, 55],
    [55, 221],
    [240, 98],
    [98, 99],
    [99, 240],
    [142, 126],
    [126, 100],
    [100, 142],
    [219, 166],
    [166, 218],
    [218, 219],
    [112, 155],
    [155, 26],
    [26, 112],
    [198, 209],
    [209, 131],
    [131, 198],
    [169, 135],
    [135, 150],
    [150, 169],
    [114, 47],
    [47, 217],
    [217, 114],
    [224, 223],
    [223, 53],
    [53, 224],
    [220, 45],
    [45, 134],
    [134, 220],
    [32, 211],
    [211, 140],
    [140, 32],
    [109, 67],
    [67, 108],
    [108, 109],
    [146, 43],
    [43, 91],
    [91, 146],
    [231, 230],
    [230, 120],
    [120, 231],
    [113, 226],
    [226, 247],
    [247, 113],
    [105, 63],
    [63, 52],
    [52, 105],
    [241, 238],
    [238, 242],
    [242, 241],
    [124, 46],
    [46, 156],
    [156, 124],
    [95, 78],
    [78, 96],
    [96, 95],
    [70, 46],
    [46, 63],
    [63, 70],
    [116, 143],
    [143, 227],
    [227, 116],
    [116, 123],
    [123, 111],
    [111, 116],
    [1, 44],
    [44, 19],
    [19, 1],
    [3, 236],
    [236, 51],
    [51, 3],
    [207, 216],
    [216, 205],
    [205, 207],
    [26, 154],
    [154, 22],
    [22, 26],
    [165, 39],
    [39, 167],
    [167, 165],
    [199, 200],
    [200, 208],
    [208, 199],
    [101, 36],
    [36, 100],
    [100, 101],
    [43, 57],
    [57, 202],
    [202, 43],
    [242, 20],
    [20, 99],
    [99, 242],
    [56, 28],
    [28, 157],
    [157, 56],
    [124, 35],
    [35, 113],
    [113, 124],
    [29, 160],
    [160, 27],
    [27, 29],
    [211, 204],
    [204, 210],
    [210, 211],
    [124, 113],
    [113, 46],
    [46, 124],
    [106, 43],
    [43, 204],
    [204, 106],
    [96, 62],
    [62, 77],
    [77, 96],
    [227, 137],
    [137, 116],
    [116, 227],
    [73, 41],
    [41, 72],
    [72, 73],
    [36, 203],
    [203, 142],
    [142, 36],
    [235, 64],
    [64, 240],
    [240, 235],
    [48, 49],
    [49, 64],
    [64, 48],
    [42, 41],
    [41, 74],
    [74, 42],
    [214, 212],
    [212, 207],
    [207, 214],
    [183, 42],
    [42, 184],
    [184, 183],
    [210, 169],
    [169, 211],
    [211, 210],
    [140, 170],
    [170, 176],
    [176, 140],
    [104, 105],
    [105, 69],
    [69, 104],
    [193, 122],
    [122, 168],
    [168, 193],
    [50, 123],
    [123, 187],
    [187, 50],
    [89, 96],
    [96, 90],
    [90, 89],
    [66, 65],
    [65, 107],
    [107, 66],
    [179, 89],
    [89, 180],
    [180, 179],
    [119, 101],
    [101, 120],
    [120, 119],
    [68, 63],
    [63, 104],
    [104, 68],
    [234, 93],
    [93, 227],
    [227, 234],
    [16, 15],
    [15, 85],
    [85, 16],
    [209, 129],
    [129, 49],
    [49, 209],
    [15, 14],
    [14, 86],
    [86, 15],
    [107, 55],
    [55, 9],
    [9, 107],
    [120, 100],
    [100, 121],
    [121, 120],
    [153, 145],
    [145, 22],
    [22, 153],
    [178, 88],
    [88, 179],
    [179, 178],
    [197, 6],
    [6, 196],
    [196, 197],
    [89, 88],
    [88, 96],
    [96, 89],
    [135, 138],
    [138, 136],
    [136, 135],
    [138, 215],
    [215, 172],
    [172, 138],
    [218, 115],
    [115, 219],
    [219, 218],
    [41, 42],
    [42, 81],
    [81, 41],
    [5, 195],
    [195, 51],
    [51, 5],
    [57, 43],
    [43, 61],
    [61, 57],
    [208, 171],
    [171, 199],
    [199, 208],
    [41, 81],
    [81, 38],
    [38, 41],
    [224, 53],
    [53, 225],
    [225, 224],
    [24, 144],
    [144, 110],
    [110, 24],
    [105, 52],
    [52, 66],
    [66, 105],
    [118, 229],
    [229, 117],
    [117, 118],
    [227, 34],
    [34, 234],
    [234, 227],
    [66, 107],
    [107, 69],
    [69, 66],
    [10, 109],
    [109, 151],
    [151, 10],
    [219, 48],
    [48, 235],
    [235, 219],
    [183, 62],
    [62, 191],
    [191, 183],
    [142, 129],
    [129, 126],
    [126, 142],
    [116, 111],
    [111, 143],
    [143, 116],
    [118, 117],
    [117, 50],
    [50, 118],
    [223, 222],
    [222, 52],
    [52, 223],
    [94, 19],
    [19, 141],
    [141, 94],
    [222, 221],
    [221, 65],
    [65, 222],
    [196, 3],
    [3, 197],
    [197, 196],
    [45, 220],
    [220, 44],
    [44, 45],
    [156, 70],
    [70, 139],
    [139, 156],
    [188, 122],
    [122, 245],
    [245, 188],
    [139, 71],
    [71, 162],
    [162, 139],
    [149, 170],
    [170, 150],
    [150, 149],
    [122, 188],
    [188, 196],
    [196, 122],
    [206, 216],
    [216, 92],
    [92, 206],
    [164, 2],
    [2, 167],
    [167, 164],
    [242, 141],
    [141, 241],
    [241, 242],
    [0, 164],
    [164, 37],
    [37, 0],
    [11, 72],
    [72, 12],
    [12, 11],
    [12, 38],
    [38, 13],
    [13, 12],
    [70, 63],
    [63, 71],
    [71, 70],
    [31, 226],
    [226, 111],
    [111, 31],
    [36, 101],
    [101, 205],
    [205, 36],
    [203, 206],
    [206, 165],
    [165, 203],
    [126, 209],
    [209, 217],
    [217, 126],
    [98, 165],
    [165, 97],
    [97, 98],
    [237, 220],
    [220, 218],
    [218, 237],
    [237, 239],
    [239, 241],
    [241, 237],
    [210, 214],
    [214, 169],
    [169, 210],
    [140, 171],
    [171, 32],
    [32, 140],
    [241, 125],
    [125, 237],
    [237, 241],
    [179, 86],
    [86, 178],
    [178, 179],
    [180, 85],
    [85, 179],
    [179, 180],
    [181, 84],
    [84, 180],
    [180, 181],
    [182, 83],
    [83, 181],
    [181, 182],
    [194, 201],
    [201, 182],
    [182, 194],
    [177, 137],
    [137, 132],
    [132, 177],
    [184, 76],
    [76, 183],
    [183, 184],
    [185, 61],
    [61, 184],
    [184, 185],
    [186, 57],
    [57, 185],
    [185, 186],
    [216, 212],
    [212, 186],
    [186, 216],
    [192, 214],
    [214, 187],
    [187, 192],
    [139, 34],
    [34, 156],
    [156, 139],
    [218, 79],
    [79, 237],
    [237, 218],
    [147, 123],
    [123, 177],
    [177, 147],
    [45, 44],
    [44, 4],
    [4, 45],
    [208, 201],
    [201, 32],
    [32, 208],
    [98, 64],
    [64, 129],
    [129, 98],
    [192, 213],
    [213, 138],
    [138, 192],
    [235, 59],
    [59, 219],
    [219, 235],
    [141, 242],
    [242, 97],
    [97, 141],
    [97, 2],
    [2, 141],
    [141, 97],
    [240, 75],
    [75, 235],
    [235, 240],
    [229, 24],
    [24, 228],
    [228, 229],
    [31, 25],
    [25, 226],
    [226, 31],
    [230, 23],
    [23, 229],
    [229, 230],
    [231, 22],
    [22, 230],
    [230, 231],
    [232, 26],
    [26, 231],
    [231, 232],
    [233, 112],
    [112, 232],
    [232, 233],
    [244, 189],
    [189, 243],
    [243, 244],
    [189, 221],
    [221, 190],
    [190, 189],
    [222, 28],
    [28, 221],
    [221, 222],
    [223, 27],
    [27, 222],
    [222, 223],
    [224, 29],
    [29, 223],
    [223, 224],
    [225, 30],
    [30, 224],
    [224, 225],
    [113, 247],
    [247, 225],
    [225, 113],
    [99, 60],
    [60, 240],
    [240, 99],
    [213, 147],
    [147, 215],
    [215, 213],
    [60, 20],
    [20, 166],
    [166, 60],
    [192, 187],
    [187, 213],
    [213, 192],
    [243, 112],
    [112, 244],
    [244, 243],
    [244, 233],
    [233, 245],
    [245, 244],
    [245, 128],
    [128, 188],
    [188, 245],
    [188, 114],
    [114, 174],
    [174, 188],
    [134, 131],
    [131, 220],
    [220, 134],
    [174, 217],
    [217, 236],
    [236, 174],
    [236, 198],
    [198, 134],
    [134, 236],
    [215, 177],
    [177, 58],
    [58, 215],
    [156, 143],
    [143, 124],
    [124, 156],
    [25, 110],
    [110, 7],
    [7, 25],
    [31, 228],
    [228, 25],
    [25, 31],
    [264, 356],
    [356, 368],
    [368, 264],
    [0, 11],
    [11, 267],
    [267, 0],
    [451, 452],
    [452, 349],
    [349, 451],
    [267, 302],
    [302, 269],
    [269, 267],
    [350, 357],
    [357, 277],
    [277, 350],
    [350, 452],
    [452, 357],
    [357, 350],
    [299, 333],
    [333, 297],
    [297, 299],
    [396, 175],
    [175, 377],
    [377, 396],
    [280, 347],
    [347, 330],
    [330, 280],
    [269, 303],
    [303, 270],
    [270, 269],
    [151, 9],
    [9, 337],
    [337, 151],
    [344, 278],
    [278, 360],
    [360, 344],
    [424, 418],
    [418, 431],
    [431, 424],
    [270, 304],
    [304, 409],
    [409, 270],
    [272, 310],
    [310, 407],
    [407, 272],
    [322, 270],
    [270, 410],
    [410, 322],
    [449, 450],
    [450, 347],
    [347, 449],
    [432, 422],
    [422, 434],
    [434, 432],
    [18, 313],
    [313, 17],
    [17, 18],
    [291, 306],
    [306, 375],
    [375, 291],
    [259, 387],
    [387, 260],
    [260, 259],
    [424, 335],
    [335, 418],
    [418, 424],
    [434, 364],
    [364, 416],
    [416, 434],
    [391, 423],
    [423, 327],
    [327, 391],
    [301, 251],
    [251, 298],
    [298, 301],
    [275, 281],
    [281, 4],
    [4, 275],
    [254, 373],
    [373, 253],
    [253, 254],
    [375, 307],
    [307, 321],
    [321, 375],
    [280, 425],
    [425, 411],
    [411, 280],
    [200, 421],
    [421, 18],
    [18, 200],
    [335, 321],
    [321, 406],
    [406, 335],
    [321, 320],
    [320, 405],
    [405, 321],
    [314, 315],
    [315, 17],
    [17, 314],
    [423, 426],
    [426, 266],
    [266, 423],
    [396, 377],
    [377, 369],
    [369, 396],
    [270, 322],
    [322, 269],
    [269, 270],
    [413, 417],
    [417, 464],
    [464, 413],
    [385, 386],
    [386, 258],
    [258, 385],
    [248, 456],
    [456, 419],
    [419, 248],
    [298, 284],
    [284, 333],
    [333, 298],
    [168, 417],
    [417, 8],
    [8, 168],
    [448, 346],
    [346, 261],
    [261, 448],
    [417, 413],
    [413, 285],
    [285, 417],
    [326, 327],
    [327, 328],
    [328, 326],
    [277, 355],
    [355, 329],
    [329, 277],
    [309, 392],
    [392, 438],
    [438, 309],
    [381, 382],
    [382, 256],
    [256, 381],
    [279, 429],
    [429, 360],
    [360, 279],
    [365, 364],
    [364, 379],
    [379, 365],
    [355, 277],
    [277, 437],
    [437, 355],
    [282, 443],
    [443, 283],
    [283, 282],
    [281, 275],
    [275, 363],
    [363, 281],
    [395, 431],
    [431, 369],
    [369, 395],
    [299, 297],
    [297, 337],
    [337, 299],
    [335, 273],
    [273, 321],
    [321, 335],
    [348, 450],
    [450, 349],
    [349, 348],
    [359, 446],
    [446, 467],
    [467, 359],
    [283, 293],
    [293, 282],
    [282, 283],
    [250, 458],
    [458, 462],
    [462, 250],
    [300, 276],
    [276, 383],
    [383, 300],
    [292, 308],
    [308, 325],
    [325, 292],
    [283, 276],
    [276, 293],
    [293, 283],
    [264, 372],
    [372, 447],
    [447, 264],
    [346, 352],
    [352, 340],
    [340, 346],
    [354, 274],
    [274, 19],
    [19, 354],
    [363, 456],
    [456, 281],
    [281, 363],
    [426, 436],
    [436, 425],
    [425, 426],
    [380, 381],
    [381, 252],
    [252, 380],
    [267, 269],
    [269, 393],
    [393, 267],
    [421, 200],
    [200, 428],
    [428, 421],
    [371, 266],
    [266, 329],
    [329, 371],
    [432, 287],
    [287, 422],
    [422, 432],
    [290, 250],
    [250, 328],
    [328, 290],
    [385, 258],
    [258, 384],
    [384, 385],
    [446, 265],
    [265, 342],
    [342, 446],
    [386, 387],
    [387, 257],
    [257, 386],
    [422, 424],
    [424, 430],
    [430, 422],
    [445, 342],
    [342, 276],
    [276, 445],
    [422, 273],
    [273, 424],
    [424, 422],
    [306, 292],
    [292, 307],
    [307, 306],
    [352, 366],
    [366, 345],
    [345, 352],
    [268, 271],
    [271, 302],
    [302, 268],
    [358, 423],
    [423, 371],
    [371, 358],
    [327, 294],
    [294, 460],
    [460, 327],
    [331, 279],
    [279, 294],
    [294, 331],
    [303, 271],
    [271, 304],
    [304, 303],
    [436, 432],
    [432, 427],
    [427, 436],
    [304, 272],
    [272, 408],
    [408, 304],
    [395, 394],
    [394, 431],
    [431, 395],
    [378, 395],
    [395, 400],
    [400, 378],
    [296, 334],
    [334, 299],
    [299, 296],
    [6, 351],
    [351, 168],
    [168, 6],
    [376, 352],
    [352, 411],
    [411, 376],
    [307, 325],
    [325, 320],
    [320, 307],
    [285, 295],
    [295, 336],
    [336, 285],
    [320, 319],
    [319, 404],
    [404, 320],
    [329, 330],
    [330, 349],
    [349, 329],
    [334, 293],
    [293, 333],
    [333, 334],
    [366, 323],
    [323, 447],
    [447, 366],
    [316, 15],
    [15, 315],
    [315, 316],
    [331, 358],
    [358, 279],
    [279, 331],
    [317, 14],
    [14, 316],
    [316, 317],
    [8, 285],
    [285, 9],
    [9, 8],
    [277, 329],
    [329, 350],
    [350, 277],
    [253, 374],
    [374, 252],
    [252, 253],
    [319, 318],
    [318, 403],
    [403, 319],
    [351, 6],
    [6, 419],
    [419, 351],
    [324, 318],
    [318, 325],
    [325, 324],
    [397, 367],
    [367, 365],
    [365, 397],
    [288, 435],
    [435, 397],
    [397, 288],
    [278, 344],
    [344, 439],
    [439, 278],
    [310, 272],
    [272, 311],
    [311, 310],
    [248, 195],
    [195, 281],
    [281, 248],
    [375, 273],
    [273, 291],
    [291, 375],
    [175, 396],
    [396, 199],
    [199, 175],
    [312, 311],
    [311, 268],
    [268, 312],
    [276, 283],
    [283, 445],
    [445, 276],
    [390, 373],
    [373, 339],
    [339, 390],
    [295, 282],
    [282, 296],
    [296, 295],
    [448, 449],
    [449, 346],
    [346, 448],
    [356, 264],
    [264, 454],
    [454, 356],
    [337, 336],
    [336, 299],
    [299, 337],
    [337, 338],
    [338, 151],
    [151, 337],
    [294, 278],
    [278, 455],
    [455, 294],
    [308, 292],
    [292, 415],
    [415, 308],
    [429, 358],
    [358, 355],
    [355, 429],
    [265, 340],
    [340, 372],
    [372, 265],
    [352, 346],
    [346, 280],
    [280, 352],
    [295, 442],
    [442, 282],
    [282, 295],
    [354, 19],
    [19, 370],
    [370, 354],
    [285, 441],
    [441, 295],
    [295, 285],
    [195, 248],
    [248, 197],
    [197, 195],
    [457, 440],
    [440, 274],
    [274, 457],
    [301, 300],
    [300, 368],
    [368, 301],
    [417, 351],
    [351, 465],
    [465, 417],
    [251, 301],
    [301, 389],
    [389, 251],
    [394, 395],
    [395, 379],
    [379, 394],
    [399, 412],
    [412, 419],
    [419, 399],
    [410, 436],
    [436, 322],
    [322, 410],
    [326, 2],
    [2, 393],
    [393, 326],
    [354, 370],
    [370, 461],
    [461, 354],
    [393, 164],
    [164, 267],
    [267, 393],
    [268, 302],
    [302, 12],
    [12, 268],
    [312, 268],
    [268, 13],
    [13, 312],
    [298, 293],
    [293, 301],
    [301, 298],
    [265, 446],
    [446, 340],
    [340, 265],
    [280, 330],
    [330, 425],
    [425, 280],
    [322, 426],
    [426, 391],
    [391, 322],
    [420, 429],
    [429, 437],
    [437, 420],
    [393, 391],
    [391, 326],
    [326, 393],
    [344, 440],
    [440, 438],
    [438, 344],
    [458, 459],
    [459, 461],
    [461, 458],
    [364, 434],
    [434, 394],
    [394, 364],
    [428, 396],
    [396, 262],
    [262, 428],
    [274, 354],
    [354, 457],
    [457, 274],
    [317, 316],
    [316, 402],
    [402, 317],
    [316, 315],
    [315, 403],
    [403, 316],
    [315, 314],
    [314, 404],
    [404, 315],
    [314, 313],
    [313, 405],
    [405, 314],
    [313, 421],
    [421, 406],
    [406, 313],
    [323, 366],
    [366, 361],
    [361, 323],
    [292, 306],
    [306, 407],
    [407, 292],
    [306, 291],
    [291, 408],
    [408, 306],
    [291, 287],
    [287, 409],
    [409, 291],
    [287, 432],
    [432, 410],
    [410, 287],
    [427, 434],
    [434, 411],
    [411, 427],
    [372, 264],
    [264, 383],
    [383, 372],
    [459, 309],
    [309, 457],
    [457, 459],
    [366, 352],
    [352, 401],
    [401, 366],
    [1, 274],
    [274, 4],
    [4, 1],
    [418, 421],
    [421, 262],
    [262, 418],
    [331, 294],
    [294, 358],
    [358, 331],
    [435, 433],
    [433, 367],
    [367, 435],
    [392, 289],
    [289, 439],
    [439, 392],
    [328, 462],
    [462, 326],
    [326, 328],
    [94, 2],
    [2, 370],
    [370, 94],
    [289, 305],
    [305, 455],
    [455, 289],
    [339, 254],
    [254, 448],
    [448, 339],
    [359, 255],
    [255, 446],
    [446, 359],
    [254, 253],
    [253, 449],
    [449, 254],
    [253, 252],
    [252, 450],
    [450, 253],
    [252, 256],
    [256, 451],
    [451, 252],
    [256, 341],
    [341, 452],
    [452, 256],
    [414, 413],
    [413, 463],
    [463, 414],
    [286, 441],
    [441, 414],
    [414, 286],
    [286, 258],
    [258, 441],
    [441, 286],
    [258, 257],
    [257, 442],
    [442, 258],
    [257, 259],
    [259, 443],
    [443, 257],
    [259, 260],
    [260, 444],
    [444, 259],
    [260, 467],
    [467, 445],
    [445, 260],
    [309, 459],
    [459, 250],
    [250, 309],
    [305, 289],
    [289, 290],
    [290, 305],
    [305, 290],
    [290, 460],
    [460, 305],
    [401, 376],
    [376, 435],
    [435, 401],
    [309, 250],
    [250, 392],
    [392, 309],
    [376, 411],
    [411, 433],
    [433, 376],
    [453, 341],
    [341, 464],
    [464, 453],
    [357, 453],
    [453, 465],
    [465, 357],
    [343, 357],
    [357, 412],
    [412, 343],
    [437, 343],
    [343, 399],
    [399, 437],
    [344, 360],
    [360, 440],
    [440, 344],
    [420, 437],
    [437, 456],
    [456, 420],
    [360, 420],
    [420, 363],
    [363, 360],
    [361, 401],
    [401, 288],
    [288, 361],
    [265, 372],
    [372, 353],
    [353, 265],
    [390, 339],
    [339, 249],
    [249, 390],
    [339, 448],
    [448, 255],
    [255, 339],
  ];

  // https://github.com/tensorflow/tfjs-models/blob/master/face-landmarks-detection/src/constants.ts

  // const LIPS_CONNECTIONS: PairArray = [
  window.LIPS_MEST = [
    [61, 146],
    [146, 91],
    [91, 181],
    [181, 84],
    [84, 17],
    [17, 314],
    [314, 405],
    [405, 321],
    [321, 375],
    [375, 291],
    [61, 185],
    [185, 40],
    [40, 39],
    [39, 37],
    [37, 0],
    [0, 267],
    [267, 269],
    [269, 270],
    [270, 409],
    [409, 291],
    [78, 95],
    [95, 88],
    [88, 178],
    [178, 87],
    [87, 14],
    [14, 317],
    [317, 402],
    [402, 318],
    [318, 324],
    [324, 308],
    [78, 191],
    [191, 80],
    [80, 81],
    [81, 82],
    [82, 13],
    [13, 312],
    [312, 311],
    [311, 310],
    [310, 415],
    [415, 308],
  ];

  window.lips_out_bot = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];

  window.lips_out_top = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];

  window.lips_in_bot = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];

  window.lips_in_top = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];

  window.mesh_nits = [
    10, 338, 337, 10, 337, 151, 109, 10, 108, 109, 108, 69, 338, 297, 299, 338, 299, 337, 67, 109, 69, 67, 69, 104, 297,
    332, 333, 297, 333, 299, 103, 67, 104, 103, 104, 68, 332, 284, 298, 332, 298, 333, 108, 10, 151, 108, 151, 107, 108,
    107, 66, 337, 299, 296, 337, 296, 336, 69, 108, 66, 69, 66, 105, 299, 333, 334, 299, 334, 296, 151, 337, 336, 151,
    336, 9, 54, 103, 68, 54, 68, 71, 284, 251, 301, 284, 301, 298, 104, 69, 105, 104, 105, 63, 333, 298, 293, 333, 293,
    334, 68, 104, 63, 68, 63, 70, 298, 301, 300, 298, 300, 293, 21, 54, 71, 21, 71, 139, 251, 389, 368, 251, 368, 301,
    66, 107, 65, 66, 65, 52, 296, 334, 282, 296, 282, 295, 105, 66, 52, 105, 52, 53, 334, 293, 283, 334, 283, 282, 336,
    296, 295, 336, 295, 285, 107, 151, 9, 107, 9, 55, 107, 55, 65, 9, 336, 285, 9, 285, 8, 63, 105, 53, 63, 53, 46, 293,
    300, 276, 293, 276, 283, 71, 68, 70, 71, 70, 156, 301, 368, 383, 301, 383, 300, 65, 55, 221, 65, 221, 222, 295, 282,
    443, 295, 443, 442, 52, 65, 223, 52, 223, 224, 282, 283, 444, 282, 444, 443, 53, 52, 224, 53, 224, 225, 283, 276,
    445, 283, 445, 444, 70, 63, 46, 70, 46, 124, 300, 383, 353, 300, 353, 276, 285, 295, 441, 285, 441, 413, 55, 9, 8,
    55, 8, 193, 55, 193, 189, 8, 285, 417, 8, 417, 168, 46, 53, 225, 46, 225, 113, 276, 353, 342, 276, 342, 445, 162,
    21, 139, 162, 139, 34, 389, 356, 264, 389, 264, 368, 223, 65, 222, 223, 222, 28, 223, 28, 27, 443, 444, 259, 443,
    259, 257, 224, 223, 29, 224, 29, 30, 444, 445, 260, 444, 260, 259, 222, 221, 56, 222, 56, 28, 442, 443, 258, 442,
    258, 286, 225, 224, 30, 225, 30, 247, 445, 342, 467, 445, 467, 260, 139, 71, 156, 139, 156, 143, 368, 264, 372, 368,
    372, 383, 441, 295, 442, 441, 442, 286, 441, 286, 414, 221, 55, 189, 221, 189, 190, 221, 190, 56, 156, 70, 124, 156,
    124, 35, 383, 372, 265, 383, 265, 353, 27, 28, 158, 27, 158, 159, 257, 259, 386, 257, 386, 385, 28, 56, 157, 28,
    157, 158, 258, 443, 257, 258, 257, 385, 258, 385, 384, 29, 223, 27, 29, 27, 159, 29, 159, 160, 259, 260, 387, 259,
    387, 386, 124, 46, 113, 124, 113, 226, 353, 265, 446, 353, 446, 342, 168, 417, 6, 417, 285, 413, 417, 413, 465, 417,
    465, 351, 193, 8, 168, 193, 168, 6, 193, 6, 122, 30, 29, 160, 30, 160, 161, 260, 467, 466, 260, 466, 388, 56, 190,
    173, 56, 173, 157, 286, 258, 384, 286, 384, 398, 159, 158, 153, 159, 153, 145, 386, 387, 373, 386, 373, 374, 113,
    225, 247, 113, 247, 130, 342, 446, 359, 342, 359, 467, 158, 157, 153, 385, 386, 380, 160, 159, 144, 387, 260, 388,
    387, 388, 390, 413, 441, 414, 413, 414, 463, 413, 463, 464, 189, 193, 245, 189, 245, 244, 189, 244, 243, 157, 173,
    154, 157, 154, 153, 384, 385, 380, 384, 380, 381, 161, 160, 163, 388, 466, 249, 247, 30, 246, 247, 246, 33, 467,
    359, 263, 467, 263, 466, 246, 30, 161, 246, 161, 7, 190, 189, 243, 190, 243, 133, 190, 133, 173, 414, 286, 398, 414,
    398, 362, 173, 133, 155, 173, 155, 154, 398, 384, 381, 398, 381, 382, 263, 249, 466, 130, 247, 33, 359, 255, 263, 7,
    33, 246, 249, 339, 390, 249, 390, 388, 226, 113, 130, 446, 261, 255, 446, 255, 359, 133, 243, 112, 133, 112, 155,
    362, 398, 382, 163, 7, 161, 390, 254, 373, 390, 373, 387, 25, 226, 130, 25, 130, 33, 25, 33, 7, 255, 448, 339, 255,
    339, 249, 255, 249, 263, 243, 244, 233, 243, 233, 112, 463, 414, 362, 463, 362, 341, 463, 341, 453, 155, 112, 154,
    35, 124, 226, 265, 340, 261, 265, 261, 446, 464, 463, 453, 154, 112, 26, 381, 380, 256, 144, 163, 160, 144, 159,
    145, 373, 253, 374, 244, 245, 188, 244, 188, 128, 244, 128, 233, 143, 156, 35, 372, 345, 340, 372, 340, 265, 153,
    154, 26, 153, 26, 22, 380, 386, 374, 380, 374, 252, 380, 252, 256, 341, 362, 382, 341, 382, 381, 341, 381, 256, 110,
    25, 7, 110, 7, 163, 339, 449, 254, 339, 254, 390, 112, 233, 232, 112, 232, 26, 465, 413, 464, 465, 464, 357, 465,
    357, 412, 34, 139, 143, 264, 447, 345, 264, 345, 372, 245, 193, 122, 245, 122, 188, 145, 153, 22, 6, 417, 351, 6,
    351, 197, 127, 162, 34, 356, 454, 447, 356, 447, 264, 26, 232, 22, 351, 465, 412, 351, 412, 419, 122, 6, 197, 122,
    197, 196, 24, 110, 163, 24, 163, 144, 24, 144, 23, 254, 450, 253, 254, 253, 373, 453, 341, 452, 233, 128, 121, 233,
    121, 232, 261, 346, 448, 261, 448, 255, 31, 35, 226, 31, 226, 25, 23, 144, 145, 23, 145, 22, 253, 451, 252, 253,
    252, 374, 452, 341, 256, 452, 256, 252, 357, 464, 453, 357, 453, 350, 357, 350, 343, 412, 357, 343, 412, 343, 399,
    128, 188, 114, 128, 114, 121, 188, 122, 196, 188, 196, 174, 188, 174, 114, 448, 347, 449, 448, 449, 339, 228, 31,
    25, 228, 25, 110, 451, 350, 452, 451, 452, 252, 231, 23, 22, 231, 22, 232, 350, 277, 343, 350, 453, 452, 121, 231,
    232, 449, 348, 450, 449, 450, 254, 229, 228, 110, 229, 110, 24, 229, 24, 230, 450, 349, 451, 450, 451, 253, 230, 24,
    23, 230, 23, 231, 340, 346, 261, 111, 143, 35, 111, 35, 31, 114, 174, 217, 197, 351, 419, 197, 419, 195, 419, 412,
    399, 419, 399, 248, 196, 197, 195, 196, 195, 3, 349, 329, 277, 349, 277, 350, 349, 350, 451, 120, 230, 231, 120,
    231, 121, 399, 343, 437, 399, 437, 456, 174, 196, 3, 174, 3, 236, 174, 236, 217, 277, 355, 437, 277, 437, 343, 47,
    120, 121, 47, 121, 114, 47, 114, 217, 346, 352, 280, 346, 280, 347, 346, 347, 448, 117, 111, 31, 117, 31, 228, 116,
    34, 143, 116, 143, 111, 116, 111, 117, 345, 352, 346, 345, 346, 340, 348, 330, 329, 348, 329, 349, 348, 349, 450,
    119, 229, 230, 119, 230, 120, 437, 420, 456, 347, 280, 330, 347, 330, 348, 347, 348, 449, 118, 117, 228, 118, 228,
    229, 118, 229, 119, 227, 127, 34, 227, 34, 116, 227, 116, 123, 447, 366, 352, 447, 352, 345, 195, 419, 248, 195,
    248, 5, 248, 399, 456, 248, 456, 281, 3, 195, 5, 3, 5, 51, 329, 371, 355, 329, 355, 277, 100, 119, 120, 100, 120,
    47, 100, 47, 126, 236, 3, 51, 236, 51, 134, 234, 127, 227, 234, 227, 137, 454, 323, 366, 454, 366, 447, 355, 429,
    420, 355, 420, 437, 126, 47, 217, 126, 217, 198, 420, 360, 363, 420, 363, 456, 198, 217, 236, 198, 236, 134, 330,
    425, 266, 330, 266, 371, 330, 371, 329, 101, 118, 119, 101, 119, 100, 101, 100, 142, 5, 248, 281, 5, 281, 4, 51, 5,
    4, 51, 4, 45, 281, 456, 363, 281, 363, 275, 363, 440, 275, 134, 51, 45, 371, 266, 358, 371, 358, 429, 371, 429, 355,
    142, 100, 126, 142, 126, 209, 429, 358, 279, 429, 279, 360, 429, 360, 420, 209, 126, 198, 209, 198, 131, 131, 198,
    134, 131, 134, 220, 360, 279, 344, 360, 344, 440, 360, 440, 363, 123, 116, 117, 123, 117, 50, 352, 376, 411, 352,
    411, 280, 4, 281, 275, 4, 275, 274, 4, 274, 1, 275, 457, 274, 45, 4, 44, 220, 134, 45, 220, 45, 237, 440, 344, 438,
    440, 438, 457, 440, 457, 275, 280, 411, 425, 280, 425, 330, 50, 117, 118, 50, 118, 101, 50, 101, 36, 279, 278, 344,
    49, 209, 131, 49, 131, 115, 36, 101, 142, 36, 142, 129, 266, 423, 358, 115, 131, 220, 115, 220, 218, 137, 227, 123,
    137, 123, 147, 366, 401, 376, 366, 376, 352, 237, 45, 44, 237, 44, 241, 331, 294, 278, 331, 278, 279, 102, 129, 49,
    102, 49, 48, 44, 4, 1, 438, 392, 309, 438, 309, 459, 438, 459, 457, 278, 439, 344, 48, 49, 115, 218, 220, 237, 218,
    237, 239, 358, 423, 294, 358, 294, 331, 358, 331, 279, 129, 142, 209, 129, 209, 49, 239, 237, 238, 459, 309, 458,
    459, 458, 457, 79, 218, 239, 79, 239, 238, 309, 250, 458, 439, 455, 392, 439, 392, 438, 439, 438, 344, 219, 48, 115,
    219, 115, 218, 93, 234, 137, 93, 137, 177, 323, 361, 401, 323, 401, 366, 125, 241, 44, 125, 44, 1, 354, 370, 19,
    354, 19, 1, 354, 1, 274, 19, 125, 1, 241, 20, 238, 241, 238, 237, 461, 354, 274, 461, 274, 457, 294, 327, 455, 294,
    455, 439, 294, 439, 278, 64, 129, 102, 64, 102, 48, 64, 48, 219, 458, 461, 457, 166, 219, 218, 166, 218, 79, 166,
    79, 60, 392, 290, 309, 455, 460, 289, 455, 289, 392, 235, 64, 219, 235, 219, 166, 425, 427, 426, 425, 426, 423, 425,
    423, 266, 205, 50, 36, 205, 36, 203, 59, 235, 166, 59, 166, 75, 289, 460, 305, 289, 305, 392, 20, 60, 79, 20, 79,
    238, 250, 462, 461, 250, 461, 458, 203, 36, 129, 203, 129, 64, 203, 64, 98, 423, 426, 391, 423, 391, 327, 423, 327,
    294, 242, 99, 20, 242, 20, 241, 242, 241, 125, 462, 326, 370, 462, 370, 354, 462, 354, 461, 141, 242, 125, 141, 125,
    19, 141, 19, 94, 370, 2, 94, 370, 94, 19, 75, 166, 60, 305, 328, 290, 305, 290, 392, 460, 391, 393, 460, 393, 328,
    460, 328, 305, 240, 98, 235, 240, 235, 59, 240, 59, 75, 290, 328, 250, 290, 250, 309, 327, 391, 460, 327, 460, 455,
    98, 64, 235, 147, 123, 187, 376, 433, 411, 99, 240, 75, 99, 75, 60, 99, 60, 20, 328, 393, 326, 328, 326, 462, 328,
    462, 250, 411, 427, 425, 187, 123, 50, 187, 50, 205, 97, 99, 242, 97, 242, 141, 97, 141, 2, 326, 164, 2, 326, 2,
    370, 2, 141, 94, 206, 205, 203, 206, 203, 165, 426, 436, 322, 426, 322, 391, 177, 137, 147, 177, 147, 213, 401, 435,
    433, 401, 433, 376, 164, 267, 0, 164, 97, 2, 393, 269, 267, 393, 267, 164, 393, 164, 326, 167, 240, 99, 167, 99, 97,
    167, 97, 164, 427, 434, 432, 427, 432, 436, 427, 436, 426, 207, 187, 205, 207, 205, 206, 391, 322, 270, 391, 270,
    269, 391, 269, 393, 165, 203, 98, 165, 98, 240, 165, 240, 167, 92, 206, 165, 92, 165, 40, 92, 40, 185, 322, 410,
    409, 322, 409, 270, 132, 93, 177, 132, 177, 215, 361, 288, 435, 361, 435, 401, 436, 287, 410, 436, 410, 322, 216,
    207, 206, 216, 206, 92, 216, 92, 186, 213, 147, 187, 433, 416, 411, 37, 167, 164, 37, 164, 0, 37, 0, 72, 267, 303,
    302, 267, 302, 0, 0, 302, 11, 39, 165, 167, 39, 167, 37, 39, 37, 73, 269, 270, 304, 269, 304, 303, 269, 303, 267,
    410, 291, 409, 186, 92, 185, 72, 0, 11, 72, 11, 38, 302, 271, 268, 302, 268, 11, 40, 165, 39, 40, 39, 74, 40, 74,
    183, 270, 409, 408, 270, 408, 407, 73, 37, 72, 73, 72, 41, 303, 304, 272, 303, 272, 271, 303, 271, 302, 74, 39, 73,
    74, 73, 42, 74, 42, 191, 304, 270, 407, 304, 407, 415, 304, 415, 272, 185, 40, 184, 185, 184, 62, 409, 292, 408, 12,
    38, 11, 268, 312, 12, 268, 12, 11, 41, 72, 38, 271, 272, 310, 184, 40, 183, 184, 183, 78, 408, 308, 407, 42, 73, 41,
    42, 41, 80, 215, 177, 213, 435, 367, 433, 192, 213, 187, 192, 187, 207, 416, 364, 434, 416, 434, 427, 416, 427, 411,
    183, 74, 191, 183, 191, 78, 13, 82, 12, 191, 42, 88, 80, 88, 42, 81, 179, 178, 81, 178, 41, 81, 41, 38, 82, 86, 87,
    82, 87, 38, 82, 38, 12, 312, 15, 14, 312, 14, 13, 312, 13, 12, 311, 316, 317, 311, 317, 268, 311, 268, 271, 310,
    403, 402, 310, 402, 271, 415, 318, 272, 78, 62, 184, 308, 325, 324, 308, 324, 415, 308, 415, 407, 76, 185, 62, 306,
    375, 292, 306, 292, 409, 292, 307, 308, 292, 308, 408, 61, 186, 185, 61, 185, 76, 291, 375, 306, 291, 306, 409, 178,
    80, 41, 87, 81, 38, 14, 82, 13, 317, 312, 268, 402, 311, 271, 318, 310, 272, 95, 78, 191, 95, 191, 88, 324, 319,
    318, 324, 318, 415, 287, 273, 291, 287, 291, 410, 57, 216, 186, 57, 186, 61, 96, 77, 78, 96, 78, 95, 325, 320, 319,
    325, 319, 324, 89, 96, 95, 89, 95, 88, 89, 88, 80, 319, 403, 310, 319, 310, 318, 432, 422, 287, 432, 287, 436, 212,
    207, 216, 212, 216, 57, 86, 179, 81, 86, 81, 87, 316, 15, 312, 316, 312, 317, 179, 89, 80, 179, 80, 178, 403, 315,
    316, 403, 316, 311, 403, 311, 402, 15, 85, 86, 15, 86, 82, 15, 82, 14, 77, 146, 62, 77, 62, 78, 307, 321, 325, 307,
    325, 308, 146, 61, 76, 146, 76, 62, 375, 321, 307, 375, 307, 292, 90, 91, 96, 90, 96, 89, 320, 405, 404, 320, 404,
    319, 214, 192, 207, 214, 207, 212, 434, 430, 422, 434, 422, 432, 180, 90, 89, 180, 89, 179, 404, 315, 403, 404, 403,
    319, 85, 181, 180, 85, 180, 179, 85, 179, 86, 315, 16, 15, 315, 15, 316, 16, 85, 15, 91, 146, 77, 91, 77, 96, 321,
    405, 320, 321, 320, 325, 43, 57, 61, 43, 61, 146, 273, 335, 375, 273, 375, 291, 58, 132, 215, 288, 397, 435, 181,
    91, 90, 181, 90, 180, 405, 314, 315, 405, 315, 404, 84, 181, 85, 84, 85, 16, 314, 18, 17, 314, 17, 16, 314, 16, 315,
    17, 84, 16, 138, 215, 213, 138, 213, 192, 367, 365, 364, 367, 364, 416, 367, 416, 433, 202, 214, 212, 202, 212, 57,
    202, 57, 43, 422, 424, 273, 422, 273, 287, 106, 43, 146, 106, 146, 91, 335, 406, 321, 335, 321, 375, 182, 106, 91,
    182, 91, 181, 406, 313, 405, 406, 405, 321, 210, 135, 214, 210, 214, 202, 210, 202, 204, 430, 431, 424, 430, 424,
    422, 313, 200, 18, 313, 18, 314, 313, 314, 405, 83, 182, 181, 83, 181, 84, 135, 138, 192, 135, 192, 214, 364, 394,
    430, 364, 430, 434, 204, 202, 43, 204, 43, 106, 424, 418, 335, 424, 335, 273, 18, 83, 84, 18, 84, 17, 172, 58, 215,
    172, 215, 138, 397, 365, 367, 397, 367, 435, 194, 204, 106, 194, 106, 182, 418, 421, 406, 418, 406, 335, 211, 210,
    204, 211, 204, 194, 431, 262, 418, 431, 418, 424, 201, 194, 182, 201, 182, 83, 421, 199, 200, 421, 200, 313, 421,
    313, 406, 169, 136, 135, 169, 135, 210, 169, 210, 211, 394, 395, 431, 394, 431, 430, 200, 201, 83, 200, 83, 18, 136,
    172, 138, 136, 138, 135, 365, 379, 394, 365, 394, 364, 32, 211, 194, 32, 194, 201, 262, 428, 421, 262, 421, 418,
    170, 169, 211, 170, 211, 32, 395, 369, 262, 395, 262, 431, 208, 32, 201, 428, 199, 421, 199, 208, 201, 199, 201,
    200, 150, 136, 169, 150, 169, 170, 379, 378, 395, 379, 395, 394, 140, 170, 32, 140, 32, 208, 369, 396, 428, 369,
    428, 262, 149, 150, 170, 149, 170, 140, 378, 400, 369, 378, 369, 395, 171, 140, 208, 171, 208, 199, 396, 175, 199,
    396, 199, 428, 175, 171, 199, 176, 149, 140, 176, 140, 171, 400, 377, 396, 400, 396, 369, 148, 176, 171, 148, 171,
    175, 377, 152, 175, 377, 175, 396, 152, 148, 175,
  ];

  //

  function faceMesh_init$1() {
    //
    let options = {
      maxFaces: 1,
      refineLandmarks: false,
      flipHorizontal: flipH,
    };

    my.faceMesh = ml5.faceMesh(options, function () {
      console.log('ml5.faceMesh loaded');
      // console.log('ml5.faceMesh loaded my.video', my.video);
      // Start detecting faces from the webcam video
      my.faceMesh.detectStart(my.video, function (results) {
        // Callback function for when faceMesh outputs data
        // Save the output to the faces variable
        if (!my.faces) {
          console.log('faceMesh.detectStart results.length', results.length);
        }
        my.faces = results;
      });
    });

    // my.input = my.video;
    my.output = createGraphics(width, height);
    my.output.noStroke();
    my.mar_h = 5; // height margin in percent
    my.mar_w = 5;
    // my.align = "center";
    my.alpha = 255;
    my.avg_color = [0, 0, 0];
    my.strokeWeight = width * 0.015; // strokeWeight
    my.strokeWeightEyes = my.strokeWeight * 1.5;
    my.strokeWeightLips = my.strokeWeight;

    faceMesh_pairsToNits();

    my.lipsOpenCount = 0;
    my.lipsOpenState = 0;
  }

  function faceMesh_pairsToNits() {
    // Extract the x coordinate from FACE_MESH_PAIRS
    mesh_nits = FACE_MESH_PAIRS.map((xy) => xy[0]);
  }

  function faceMesh_inputPtToOutput$1(pt) {
    let { x, y } = pt;
    x = (x - my.x0k) * my.rx + my.x0;
    y = (y - my.y0k) * my.ry + my.y0;
    return { x, y };
  }

  function faceMesh_outputPtToInput$1(pt) {
    let { x, y } = pt;
    x = my.x0k + (x - my.x0) / my.rx;
    y = my.y0k + (y - my.y0) / my.ry;
    return { x, y };
  }

  window.faceMesh_init = faceMesh_init$1;
  window.faceMesh_inputPtToOutput = faceMesh_inputPtToOutput$1;
  window.faceMesh_outputPtToInput = faceMesh_outputPtToInput$1;

  //

  // my.output
  // my.mar_w
  // my.mar_h
  // my.align
  // my.alpha
  // my.avg_color[]

  // function faceMesh_render(my, input, predictions) {
  function faceMesh_render$1(my, keypoints) {
    let input = my.input.get();
    if (!input) return;

    let layer = my.output;
    let out_w = layer.width;
    let out_h = layer.height;
    let mar_w = out_w * (my.mar_w / 100);
    let mar_h = out_h * (my.mar_h / 100);
    let rr = out_h / input.height;
    let align_none = my.align === 'none';
    let align_left = my.align === 'left';
    let align_right = my.align === 'right';
    // let align_center = my.align === 'center';

    let col_sum = [0, 0, 0];
    let ncol = 0;

    let y1k = keypoints[10].y;
    let y2k = keypoints[152].y;
    let x1k = keypoints[234].x;
    let x2k = keypoints[454].x;

    let x0k = x1k;
    let y0k = y1k;
    let xlen = x2k - x1k;
    let ylen = y2k - y1k;
    let ry = (out_h - mar_h * 2) / ylen;
    // let rx = (out_w - mar_w * 2) / xlen;
    let rx = ry;
    let x0 = 0; // flush left
    let y0 = mar_h;

    if (align_right) {
      x0 = out_w - xlen * rx;
    } else if (align_left) {
      x0 = mar_w;
    } else if (align_none) {
      rx = rr;
      ry = rr;
      x0k = 0;
      y0k = 0;
    } else {
      // align_center
      x0 = (out_w - xlen * rx) / 2;
    }

    // layer.strokeWeight(0);
    layer.noStroke();
    let n = mesh_nits.length;
    for (let j = 0; j < n; j += 3) {
      let { x: x1, y: y1 } = keypoints[mesh_nits[j]];
      let { x: x2, y: y2 } = keypoints[mesh_nits[j + 1]];
      let { x: x3, y: y3 } = keypoints[mesh_nits[j + 2]];
      let col = input.get(x1, y1);
      col[3] = my.alpha;
      col_sum[0] += col[0];
      col_sum[1] += col[1];
      col_sum[2] += col[2];
      ncol++;
      x1 = (x1 - x0k) * rx + x0;
      y1 = (y1 - y0k) * ry + y0;
      x2 = (x2 - x0k) * rx + x0;
      y2 = (y2 - y0k) * ry + y0;
      x3 = (x3 - x0k) * rx + x0;
      y3 = (y3 - y0k) * ry + y0;
      layer.fill(col);
      layer.triangle(x1, y1, x2, y2, x3, y3);
    }
    if (ncol > 0) {
      my.avg_color[0] = int(col_sum[0] / ncol);
      my.avg_color[1] = int(col_sum[1] / ncol);
      my.avg_color[2] = int(col_sum[2] / ncol);
    }
    my.x0 = x0;
    my.y0 = y0;
    my.x0k = x0k;
    my.y0k = y0k;
    my.rx = rx;
    my.ry = ry;
    my.xlen = xlen;
    my.ylen = ylen;

    let { y: y1 } = keypoints[13];
    let { y: y2 } = keypoints[14];
    my.lipsDiff = (y2 - y1) / ylen;
    // console.log('my.lipsDiff', my.lipsDiff);
  }

  // lips_in_top 13
  // lips_in_bot 14

  window.faceMesh_render = faceMesh_render$1;
})();
