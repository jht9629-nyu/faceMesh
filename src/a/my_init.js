//
function my_init() {
  // updated to verify change on mobile
  my.version = '?v=05';
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
  my.footerHeight = '288px';
  my.qrCodeWidth = '25%';

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
  console.log('window_resized windowWidth', windowWidth, 'my.thumbWidth', my.thumbWidth);
}
