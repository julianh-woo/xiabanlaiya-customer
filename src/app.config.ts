export default defineComponentConfig({
  pages: [
    'pages/home/index',
    'pages/login/index',
    'pages/product-detail/index',
    'pages/cart/index',
    'pages/checkout/index',
    'pages/orders/index',
    'pages/order-detail/index',
    'pages/reservations/index',
    'pages/profile/index',
    'pages/notifications/index',
    'pages/notifications/detail',
    'pages/points-history/index',
    'pages/points-mall/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#FF6B00',
    navigationBarTitleText: '下班来鸭',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F5F5',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#FF6B00',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-active.png',
      },
      {
        pagePath: 'pages/orders/index',
        text: '订单',
        iconPath: 'assets/tabbar/orders.png',
        selectedIconPath: 'assets/tabbar/orders-active.png',
      },
      {
        pagePath: 'pages/cart/index',
        text: '购物车',
        iconPath: 'assets/tabbar/cart.png',
        selectedIconPath: 'assets/tabbar/cart-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tabbar/profile.png',
        selectedIconPath: 'assets/tabbar/profile-active.png',
      },
    ],
  },
  permission: {
    'scope.userLocation': {
      desc: '你的位置信息将用于小程序定位功能',
    },
    'scope.chooseAddress': {
      desc: '用于选择收货地址',
    },
  },
  requiredPrivateInfos: ['getLocation', 'chooseAddress'],
  usingComponents: {},
});
