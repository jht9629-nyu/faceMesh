//
function create_ui() {
  //
  ui_begin();

  my.ui_container = createDiv('').id('id_dash_buttons');
  my.ui_container.style('position: fixed; z-index: 100;');

  let ver = ui_span(0, my.mo_group + my.version);
  ver.elt.style.backgroundColor = 'white';

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

    // my.takeBtn = ui_createButton('Take');
    // my.takeBtn.mousePressed(take_action);

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

  // Gallery is below canvs
  my.ui_container = null;
  my.gallery_div = ui_div_empty('id_gallery');
  // my.gallery_div.elt.style.margin = '0px 40px';
  my.gallery_div.elt.style.margin = `0px ${my.gallery_margin}`;
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

// Create image element for an index
//  or return if already present
//
function find_img(key) {
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
    my.gallery_div.elt.prepend(span.elt);

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
  show_action();
}

function hide_action_ui() {
  first_mesh_check();
  my.show_hide_taken = 1;
  // id_main.classList.add('hidden');
  hide_action();
}

function show_action() {
  id_main.classList.remove('hidden');
  my.face_hidden = 0;
  scroller_pause();
}

function hide_action() {
  id_main.classList.add('hidden');
  my.face_hidden = 1;
}

function mesh_action() {
  my.show_mesh = !my.show_mesh;
}

function fullScreen_action() {
  ui_toggleFullScreen();
}
