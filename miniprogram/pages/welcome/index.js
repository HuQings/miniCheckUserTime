Page({
  goToDemographics() {
    getApp().initStorage();
    wx.navigateTo({
      url: '/pages/demographics/index'
    });
  }
});