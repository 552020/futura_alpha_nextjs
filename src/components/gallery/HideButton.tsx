'use client';

import React from 'react';

interface HideButtonProps {
  imageId: string;
  onHide: () => void;
}

const HideButton: React.FC<HideButtonProps> = ({ imageId: _imageId, onHide }) => {
  return <button onClick={onHide}>Hide</button>;
};

export default HideButton;
