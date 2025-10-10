<template>
  <Editor :content="variable" />
</template>

<script setup lang="ts">
import Editor from '@/panel/toolbox/variable_manager2/Editor.vue';

const variable = {
  _id: '68e8e4663ea369cabc250d58',
  index: 0,
  guid: '3797e78b-a2a9-4f89-b7d7-ceb38be80d87',
  isActive: true,
  balance: '$2,800.32',
  picture: 'http://placehold.it/32x32',
  age: 32,
  eyeColor: 'green',
  name: 'Washington Lee',
  gender: 'male',
  company: 'KAGGLE',
  email: 'washingtonlee@kaggle.com',
  phone: '+1 (830) 423-2548',
  address: '884 Ferris Street, Waiohinu, Minnesota, 9093',
  about:
    'Amet ullamco magna pariatur culpa. Consectetur aliquip magna laborum cupidatat. Dolore ullamco qui irure laboris officia in eiusmod exercitation reprehenderit dolor mollit ad ut fugiat. Eu nulla anim voluptate aute cupidatat proident dolore. Nostrud laborum Lorem officia nisi fugiat et sunt nisi pariatur ipsum reprehenderit cupidatat aliquip.\r\n',
  registered: '2025-05-30T06:42:20 -08:00',
  latitude: 58.050819,
  longitude: -119.787627,
  tags: ['pariatur', 'incididunt', 'voluptate', 'consectetur', 'do', 'fugiat', 'nisi'],
  friends: [
    {
      id: 0,
      name: 'Malinda Key',
    },
    {
      id: 1,
      name: 'Cantu Cannon',
    },
    {
      id: 2,
      name: 'Rivera Rios',
    },
  ],
  greeting: 'Hello, Washington Lee! You have 10 unread messages.',
  favoriteFruit: 'banana',
};
</script>
