<template>
  <Editor :content="variables" />
</template>

<script setup lang="ts">
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';

const variables = {
  _id: '68e9bd3e958440229e6b3353',
  index: 0,
  guid: '4eaefccd-02b8-4768-9193-9fefb09773af',
  isActive: false,
  balance: '$3,860.45',
  picture: 'http://placehold.it/32x32',
  age: 29,
  eyeColor: 'green',
  name: 'Virginia Cooper',
  gender: 'female',
  company: 'ZOGAK',
  email: 'virginiacooper@zogak.com',
  phone: '+1 (878) 425-3018',
  address: '562 Prescott Place, Shawmut, West Virginia, 9758',
  about:
    'Culpa ut elit incididunt sunt duis non aliqua labore velit sit nostrud eu sunt. Commodo deserunt consectetur cillum nisi et magna veniam adipisicing minim cupidatat sunt ut sunt. Sint ut adipisicing aute amet nulla do irure occaecat veniam commodo voluptate velit mollit. Laboris non nostrud non amet qui do minim. Laborum sunt ea elit qui mollit. In ea enim consequat esse.\r\n',
  registered: '2020-03-16T06:04:42 -08:00',
  latitude: -13.40219,
  longitude: 78.835286,
  tags: ['anim', 'reprehenderit', 'aute', 'mollit', 'Lorem', 'mollit', 'voluptate'],
  friends: [
    {
      id: 0,
      name: 'Yvette Larsen',
    },
    {
      id: 1,
      name: 'Lolita Lee',
    },
    {
      id: 2,
      name: 'Spencer Pruitt',
    },
  ],
  greeting: 'Hello, Virginia Cooper! You have 4 unread messages.',
  favoriteFruit: 'strawberry',
};
</script>
