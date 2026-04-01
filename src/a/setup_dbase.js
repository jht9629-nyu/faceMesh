async function setup_dbase() {
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
    console.log('observed_event ', event, key, item);
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

function add_action_startLoader() {
  startLoader();
  if (!my.add_action_loading) my.add_action_loading = 0;
  my.add_action_loading++;
  if (my.add_action_loading == 1) {
    my.add_action_startTime = Date.now();
  }
  console.log('add_action_startLoader ', my.add_action_loading);
}

function add_action_stopLoader() {
  if (my.add_action_loading) {
    stopLoader();
    my.add_action_loading--;
    let lapse = (Date.now() - my.add_action_startTime) / 1000;
    console.log('add_action_stopLoader ', my.add_action_loading, 'lapse', lapse);
  }
}

function first_mesh_check() {
  if (my.waiting_for_first_mesh) {
    my.waiting_for_first_mesh = 0;
    stopLoader();
  }
}
