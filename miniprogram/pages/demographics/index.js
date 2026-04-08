Page({
  data: {
    hasConsent: false,
    demographics: {
      gender: '',
      grade: ''
    },
    usageData: {
      entertainment: { frequency: '', hours: '' },
      learning: { frequency: '', hours: '' },
      social: { frequency: '', hours: '' }
    },
    canSubmit: false
  },

  onConsentChange(e) {
    this.setData({
      hasConsent: e.detail.value.includes('agreed'),
      canSubmit: this.checkCanSubmit(e.detail.value.includes('agreed'), this.data.demographics)
    });
  },

  onGenderSelect(e) {
    const gender = e.currentTarget.dataset.value;
    const demographics = { ...this.data.demographics, gender };
    this.setData({
      demographics,
      canSubmit: this.checkCanSubmit(this.data.hasConsent, demographics)
    });
  },

  onGradeSelect(e) {
    const grade = e.currentTarget.dataset.value;
    const demographics = { ...this.data.demographics, grade };
    this.setData({
      demographics,
      canSubmit: this.checkCanSubmit(this.data.hasConsent, demographics)
    });
  },

  onFreqChange(e) {
    const type = e.currentTarget.dataset.type;
    const field = e.currentTarget.dataset.field;
    const usageData = { ...this.data.usageData };
    usageData[type][field] = e.detail.value;
    this.setData({ usageData });
  },

  onHoursChange(e) {
    const type = e.currentTarget.dataset.type;
    const field = e.currentTarget.dataset.field;
    const usageData = { ...this.data.usageData };
    usageData[type][field] = e.detail.value;
    this.setData({ usageData });
  },

  checkCanSubmit(hasConsent, demographics) {
    return hasConsent && demographics.gender && demographics.grade;
  },

  onNext() {
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请完成所有必填项',
        icon: 'none'
      });
      return;
    }

    wx.setStorageSync('demographics', this.data.demographics);

    const dailyRecords = wx.getStorageSync('dailyRecords') || [];
    dailyRecords.push({
      day: 1,
      phase: 1,
      dayInPhase: 1,
      usageData: this.data.usageData,
      createTime: new Date().toISOString()
    });
    wx.setStorageSync('dailyRecords', dailyRecords);

    const app = getApp();
    app.globalData.demographics = this.data.demographics;
    app.globalData.day1Data = this.data.usageData;
    app.globalData.phase = 1;
    app.globalData.currentDay = 1;

    wx.navigateTo({
      url: '/pages/usage-form/index?day=2'
    });
  }
});