Page({
  data: {
    currentDay: 1,
    phase: 1,
    phaseText: '基线评估期（第1周）',
    formData: {
      entertainment: { frequency: '', hours: '' },
      learning: { frequency: '', hours: '' },
      social: { frequency: '', hours: '' }
    },
    isSubmitting: false
  },

  onLoad: function(options) {
    const app = getApp();
    const day = parseInt(options.day) || 2;
    const phase = app.globalData.phase || 1;
    
    let phaseText = '';
    if (phase === 1) {
      phaseText = '基线评估期（第1周）';
    } else if (phase === 2) {
      phaseText = '干预期（第2周）';
    } else {
      phaseText = '干预期（第3周）';
    }

    this.setData({
      currentDay: day,
      phase: phase,
      phaseText: phaseText
    });

    wx.setNavigationBarTitle({
      title: `第${day}天 - 短视频使用记录`
    });
  },

  onFreqChange(e) {
    const type = e.currentTarget.dataset.type;
    const field = e.currentTarget.dataset.field;
    const formData = { ...this.data.formData };
    formData[type][field] = e.detail.value;
    this.setData({ formData });
  },

  onHoursChange(e) {
    const type = e.currentTarget.dataset.type;
    const field = e.currentTarget.dataset.field;
    const formData = { ...this.data.formData };
    formData[type][field] = e.detail.value;
    this.setData({ formData });
  },

  onSubmit() {
    if (this.data.isSubmitting) return;

    this.setData({ isSubmitting: true });

    const app = getApp();
    const { currentDay, phase, formData } = this.data;

    const dayInPhase = phase === 1 ? currentDay : (phase === 2 ? currentDay - 7 : currentDay - 14);
    const totalDay = (phase - 1) * 7 + currentDay;

    const dailyRecords = wx.getStorageSync('dailyRecords') || [];
    dailyRecords.push({
      day: totalDay,
      phase: phase,
      dayInPhase: dayInPhase,
      usageData: formData,
      createTime: new Date().toISOString()
    });
    wx.setStorageSync('dailyRecords', dailyRecords);

    setTimeout(() => {
      this.setData({ isSubmitting: false });
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      app.globalData.currentDay = currentDay;
      app.globalData.phase = phase;

      if (phase === 1 && currentDay < 7) {
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/usage-form/index?day=${currentDay + 1}`
          });
        }, 1500);
      } else if (phase === 1 && currentDay === 7) {
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/questionnaire/index?type=baseline'
          });
        }, 1500);
      } else if (phase === 2 && currentDay < 7) {
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/usage-form/index?day=${currentDay + 1}`
          });
        }, 1500);
      } else if (phase === 2 && currentDay === 7) {
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/questionnaire/index?type=intervention1'
          });
        }, 1500);
      } else if (phase === 3 && currentDay < 7) {
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/usage-form/index?day=${currentDay + 1}`
          });
        }, 1500);
      } else if (phase === 3 && currentDay === 7) {
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/questionnaire/index?type=intervention2'
          });
        }, 1500);
      }
    }, 500);
  }
});