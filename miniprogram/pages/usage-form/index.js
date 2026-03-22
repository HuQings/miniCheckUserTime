Page({
  data: {
    currentDay: 1,
    period: 7,
    formData: {
      weekdayHours: '',
      weekendHours: '',
      socialHours: '',
      workHours: '',
      gameHours: '',
      videoHours: '',
      shopHours: ''
    },
    isSubmitting: false,
    showModal: false,
    adviceData: null
  },

  onLoad: function(options) {
    const period = getApp().globalData.period || 7;
    const day = parseInt(options.day) || 1;
    this.setData({
      currentDay: day,
      period: period
    });
    
    // 更新导航栏标题
    wx.setNavigationBarTitle({
      title: `第${day}天 - 填写使用情况`
    });
  },

  onWeekdayHoursChange(e) {
    this.setData({
      'formData.weekdayHours': e.detail.value
    });
  },

  onWeekendHoursChange(e) {
    this.setData({
      'formData.weekendHours': e.detail.value
    });
  },

  onSocialHoursChange(e) {
    this.setData({
      'formData.socialHours': e.detail.value
    });
  },

  onWorkHoursChange(e) {
    this.setData({
      'formData.workHours': e.detail.value
    });
  },

  onGameHoursChange(e) {
    this.setData({
      'formData.gameHours': e.detail.value
    });
  },

  onVideoHoursChange(e) {
    this.setData({
      'formData.videoHours': e.detail.value
    });
  },

  onShopHoursChange(e) {
    this.setData({
      'formData.shopHours': e.detail.value
    });
  },

  validateForm() {
    const { formData } = this.data;
    
    if (!formData.weekdayHours || parseFloat(formData.weekdayHours) < 0) {
      wx.showToast({
        title: '请输入有效的工作日使用时长',
        icon: 'none'
      });
      return false;
    }

    if (!formData.weekendHours || parseFloat(formData.weekendHours) < 0) {
      wx.showToast({
        title: '请输入有效的周末使用时长',
        icon: 'none'
      });
      return false;
    }

    if (!formData.socialHours || parseFloat(formData.socialHours) < 0) {
      wx.showToast({
        title: '请输入有效的社交娱乐时长',
        icon: 'none'
      });
      return false;
    }

    if (!formData.workHours || parseFloat(formData.workHours) < 0) {
      wx.showToast({
        title: '请输入有效的工作学习时长',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    if (this.data.isSubmitting) {
      return;
    }

    this.setData({ isSubmitting: true });

    wx.showLoading({
      title: '分析中...'
    });

    const { formData, currentDay, period } = this.data;
    const app = getApp();

    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'analyzeUsage',
        day: currentDay,
        period: period,
        data: formData,
        openid: app.globalData.openid,
        userInfo: app.globalData.userInfo
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        this.setData({
          adviceData: res.result.data,
          showModal: true,
          isSubmitting: false
        });
      } else {
        wx.showToast({
          title: '分析失败，请重试',
          icon: 'none'
        });
        this.setData({ isSubmitting: false });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('云函数调用失败:', err);
      
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
      this.setData({ isSubmitting: false });
    });
  },

  onCloseModal() {
    this.setData({
      showModal: false,
      adviceData: null
    });
  },

  onRetry() {
    this.setData({
      showModal: false,
      adviceData: null
    });
    wx.navigateBack();
  },

  onFinish() {
    this.setData({
      showModal: false,
      adviceData: null
    });
    wx.reLaunch({
      url: '/pages/welcome/index'
    });
  }
});