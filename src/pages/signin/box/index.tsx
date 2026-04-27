import React, { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Button, Canvas } from '@tarojs/components';
import {
  openBox,
  BoxReward,
  getBoxTypeText,
  getBoxTypeColor,
  handleSigninError,
} from '@/network/signin';
import './index.scss';

const SigninBox: React.FC = () => {
  const router = useRouter();
  const { boxId, boxType } = router.params;
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [reward, setReward] = useState<BoxReward | null>(null);
  const [animationPlaying, setAnimationPlaying] = useState(false);

  useEffect(() => {
    if (!boxId) {
      Taro.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => Taro.navigateBack(), 1500);
    }
  }, [boxId]);

  const handleOpenBox = async () => {
    if (opened || loading) return;

    setAnimationPlaying(true);

    // 播放开盒动画
    setTimeout(async () => {
      setLoading(true);
      try {
        const result = await openBox(boxId);
        setReward(result);
        setOpened(true);
        setAnimationPlaying(false);

        // 震动反馈
        Taro.vibrateShort();
      } catch (error) {
        console.error('开盒失败:', error);
        Taro.showToast({
          title: handleSigninError(error) || '开盒失败',
          icon: 'none',
        });
        setAnimationPlaying(false);
      } finally {
        setLoading(false);
      }
    }, 2000);
  };

  const handleShare = () => {
    // 分享功能
    Taro.showShareMenu({
      withShareTicket: true,
    });
  };

  const handleGoBack = () => {
    Taro.navigateBack();
  };

  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case 'POINTS':
        return '🥚';
      case 'REPAIR_CARD':
        return '🔧';
      case 'COUPON':
        return '🎫';
      default:
        return '🎁';
    }
  };

  const getRewardName = (rewardType: string) => {
    switch (rewardType) {
      case 'POINTS':
        return '鸭蛋';
      case 'REPAIR_CARD':
        return '补签卡';
      case 'COUPON':
        return '优惠券';
      default:
        return '奖励';
    }
  };

  return (
    <View className="box-page">
      {/* 背景装饰 */}
      <View className="bg-decoration">
        <View className="particle particle-1" />
        <View className="particle particle-2" />
        <View className="particle particle-3" />
      </View>

      {/* 盲盒区域 */}
      <View className="box-container">
        {/* 未开启状态 */}
        {!opened && (
          <>
            <View
              className={`mystery-box ${animationPlaying ? 'opening' : ''}`}
              style={{ '--box-color': getBoxTypeColor(boxType as any) }}
            >
              <View className="box-top">
                <View className="question-mark">?</View>
              </View>
              <View className="box-bottom">
                <View className="box-glow" />
              </View>
              <View className="box-shine" />
            </View>

            <Text className="box-type-label" style={{ color: getBoxTypeColor(boxType as any) }}>
              {getBoxTypeText(boxType as any)}
            </Text>

            <Text className="box-hint">
              {animationPlaying ? '正在开启...' : '点击下方按钮开启盲盒'}
            </Text>
          </>
        )}

        {/* 已开启状态 */}
        {opened && reward && (
          <View className="reward-display">
            <View
              className="reward-card"
              style={{ '--reward-color': getBoxTypeColor(reward.boxType) }}
            >
              <View className="reward-icon">{getRewardIcon(reward.rewardType)}</View>
              <View className="reward-info">
                <Text className="reward-title">
                  {reward.boxType === 'epic' && '🔥 '}
                  {reward.boxType === 'rare' && '✨ '}
                  {getBoxTypeText(reward.boxType)}
                </Text>
                <Text className="reward-value">
                  {reward.rewardValue}
                  {getRewardName(reward.rewardType)}
                </Text>
                <Text className="reward-desc">{reward.rewardDesc}</Text>
              </View>

              {/* 特效 */}
              {reward.boxType !== 'normal' && (
                <View className="reward-sparkles">
                  {[...Array(6)].map((_, i) => (
                    <View key={i} className={`sparkle sparkle-${i + 1}`} />
                  ))}
                </View>
              )}
            </View>

            {/* 奖励详情 */}
            <View className="reward-detail">
              <View className="detail-row">
                <Text className="detail-label">盲盒类型</Text>
                <Text className="detail-value">{getBoxTypeText(reward.boxType)}</Text>
              </View>
              <View className="detail-row">
                <Text className="detail-label">奖励内容</Text>
                <Text className="detail-value">{reward.rewardDesc}</Text>
              </View>
              <View className="detail-row">
                <Text className="detail-label">开启时间</Text>
                <Text className="detail-value">{reward.openedAt}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* 按钮区域 */}
      <View className="action-area">
        {!opened ? (
          <Button
            className={`open-btn ${animationPlaying ? 'loading' : ''}`}
            onClick={handleOpenBox}
            disabled={animationPlaying}
          >
            {loading ? '开启中...' : animationPlaying ? '开启中...' : '🎁 开启盲盒'}
          </Button>
        ) : (
          <View className="opened-actions">
            <Button className="share-btn" onClick={handleShare}>
              分享给好友
            </Button>
            <Button className="back-btn" onClick={handleGoBack}>
              返回签到页
            </Button>
          </View>
        )}
      </View>

      {/* 规则说明 */}
      {!opened && (
        <View className="rules-hint">
          <Text className="rules-title">盲盒说明</Text>
          <Text className="rules-content">
            • 普通盲盒：1-7天连续签到获得
            {'\n'}
            • 稀有盲盒：8-14天连续签到获得，奖励翻倍
            {'\n'}
            • 史诗盲盒：15天以上连续签到获得，保底大额积分
          </Text>
        </View>
      )}
    </View>
  );
};

export default SigninBox;
