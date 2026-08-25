Page({
  data: {
    userInfo: null,
    hasLogin: false,
    isLoading: false,
    checkinDays: [],
    checkinWeeks: [],
    completedDays: 0,
    currentDay: 1,
    todayCompleted: false,
    canCheckinToday: true,
    experimentCompleted: false,
    projectName: '国家级大创项目实验平台',
    projectNumber: '202514390020',
    initialConsentText: '我同意参加该项目为期24天的实验活动，我承诺会全程参与。',
    showInitialConsent: false,
    initialConsentChecked: false,
    isConsentSubmitting: false,
    period: 24
  },

  onLoad: function (options) {
    const period = getApp().globalData.period || 24;
    const hasLogin = Boolean(getApp().globalData.openid);
    this.setData({ period, hasLogin });
    this.initCheckinDays();
    this.loadSurveyConfig();
  },

  loadSurveyConfig: function() {
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getSurveyConfig'
      }
    }).then(res => {
      if (res.result && res.result.data && res.result.data.period) {
        const config = res.result.data;
        const period = config.period;
        getApp().globalData.period = period;
        this.setData({
          period,
          projectName: config.projectName || this.data.projectName,
          projectNumber: config.projectNumber || this.data.projectNumber,
          initialConsentText: config.consentText || this.data.initialConsentText
        }, () => {
          this.initCheckinDays();
          if (getApp().globalData.openid) {
            this.loadCheckinProgress();
          }
        });
      }
    }).catch(err => {
      console.error('获取问卷配置失败:', err);
    });
  },

  onShow: function() {
    if (this.data.hasLogin) {
      this.loadCheckinProgress();
    }
  },

  initCheckinDays: function() {
    const checkinDays = [];
    const period = this.data.period;
    for (let i = 1; i <= period; i++) {
      checkinDays.push({
        day: i,
        completed: false,
        current: i === 1
      });
    }
    this.setData({
      checkinDays,
      checkinWeeks: this.groupCheckinWeeks(checkinDays)
    });
  },

  groupCheckinWeeks: function(checkinDays) {
    return [
      { week: 1, days: checkinDays.slice(0, 3) },
      { week: 2, days: checkinDays.slice(3, 10) },
      { week: 3, days: checkinDays.slice(10, 17) },
      { week: 4, days: checkinDays.slice(17, 24) }
    ].filter(item => item.days.length > 0);
  },

  loadCheckinProgress: function() {
    return wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getCheckinProgress',
        openid: getApp().globalData.openid,
        period: getApp().globalData.period || 24
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const { records, currentDay, todayCompleted, canCheckinToday, experimentCompleted } = res.result.data;
        const checkinDays = this.data.checkinDays.map(item => {
          return {
            ...item,
            completed: records.some(r => r.day === item.day),
            current: item.day === currentDay
          };
        });
        const completedDays = checkinDays.filter(item => item.completed).length;
        this.setData({
          checkinDays,
          checkinWeeks: this.groupCheckinWeeks(checkinDays),
          completedDays,
          currentDay,
          todayCompleted: Boolean(todayCompleted),
          canCheckinToday: canCheckinToday !== false,
          experimentCompleted: Boolean(experimentCompleted)
        });
      }
    }).catch(err => {
      console.error('获取打卡进度失败:', err);
    });
  },

  goToForm: function() {
    const app = getApp();
    if (app.globalData.openid) {
      this.prepareFormEntry();
      return;
    }

    this.setData({ isLoading: true });
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getOpenId'
      }
    }).then(res => {
      if (res.result && res.result.openid) {
        app.globalData.openid = res.result.openid;
        this.setData({
          hasLogin: true,
          isLoading: false
        });
        this.prepareFormEntry();
      } else {
        throw new Error('未获取到 openid');
      }
    }).catch(err => {
      console.error('获取 openid 失败:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    });
  },

  prepareFormEntry: function() {
    this.loadCheckinProgress().then(() => {
      if (this.data.experimentCompleted) {
        wx.showToast({ title: '24天评估已全部完成', icon: 'none' });
        return;
      }
      if (!this.data.canCheckinToday) {
        wx.showToast({ title: '今日检查已完成，请明天再来', icon: 'none' });
        return;
      }
      if (this.data.currentDay !== 1 || this.data.completedDays > 0) {
        this.navigateToCurrentForm();
        return;
      }

      wx.cloud.callFunction({
        name: 'cloudUserInfo',
        data: { type: 'getInitialConsentStatus' }
      }).then(res => {
        if (res.result && res.result.success && res.result.data.accepted) {
          this.navigateToCurrentForm();
          return;
        }
        this.setData({
          showInitialConsent: true,
          initialConsentChecked: false
        });
      }).catch(err => {
        console.error('获取知情同意状态失败:', err);
        wx.showToast({ title: '加载失败，请重试', icon: 'none' });
      });
    });
  },

  navigateToCurrentForm: function() {
    wx.navigateTo({
      url: `/pages/usage-form/index?day=${this.data.currentDay}`
    });
  },

  onInitialConsentToggle: function() {
    this.setData({ initialConsentChecked: !this.data.initialConsentChecked });
  },

  onContentTap: function() {},

  onInitialConsentCancel: function() {
    if (this.data.isConsentSubmitting) return;
    this.setData({
      showInitialConsent: false,
      initialConsentChecked: false
    });
  },

  onInitialConsentConfirm: function() {
    if (!this.data.initialConsentChecked) {
      wx.showToast({ title: '请阅读并确认知情同意', icon: 'none' });
      return;
    }
    if (this.data.isConsentSubmitting) return;

    this.setData({ isConsentSubmitting: true });
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: { type: 'acceptInitialConsent' }
    }).then(res => {
      if (!res.result || !res.result.success) {
        throw new Error((res.result && res.result.errMsg) || '确认失败');
      }
      this.setData({
        showInitialConsent: false,
        initialConsentChecked: false,
        isConsentSubmitting: false
      });
      this.navigateToCurrentForm();
    }).catch(err => {
      console.error('保存知情同意失败:', err);
      this.setData({ isConsentSubmitting: false });
      wx.showToast({ title: '确认失败，请重试', icon: 'none' });
    });
  },

  login: function() {
    // if (this.data.isLoading) {
    //   return;
    // }

    // this.setData({ isLoading: true });

    wx.getUserProfile({
      desc: '用于完善用户信息',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo
        });

        this.getOpenId();
      },
      fail: (err) => {
        wx.showToast({
          title: '需要授权才能继续',
          icon: 'none'
        });
        this.setData({ isLoading: false });
      }
    });
  },

  getOpenId: function() {
    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getOpenId'
      }
    }).then(res => {
      if (res.result && res.result.openid) {
        const app = getApp();
        app.globalData.userInfo = this.data.userInfo;
        app.globalData.openid = res.result.openid;
        
        this.setData({
          hasLogin: true,
          isLoading: false
        });

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        this.loadCheckinProgress();
      }
    }).catch(err => {
      console.error('获取 openid 失败:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    });
  }
});