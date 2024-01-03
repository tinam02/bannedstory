import { createContext, useEffect, useMemo, useState } from 'react';

const CharContext = createContext({ toggleCustomFeature: () => {} });

const ToggleCustomFeatureProvider = ({ children }: any) => {
  const [customFeature, setCustomFeature] = useState('default');

  const customFeatureContext = useMemo(
    () => ({
      toggleCustomFeature: () => {
        setCustomFeature(prevFeature =>
          prevFeature === 'default' ? 'custom' : 'default'
        );
        localStorage.setItem(
          'customFeature',
          customFeature === 'default' ? 'custom' : 'default'
        );
      },
    }),
    [customFeature]
  );

  useEffect(() => {
    const localCustomFeature = localStorage.getItem('customFeature');
    localCustomFeature && setCustomFeature(localCustomFeature);
  }, []);

  return (
    <CharContext.Provider value={customFeatureContext}>
      {children}
    </CharContext.Provider>
  );
};

export { CharContext, ToggleCustomFeatureProvider };
