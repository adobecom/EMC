import React from 'react'
import { Heading, Button, ButtonGroup, Content, Dialog, DialogTrigger, Flex, Text, View, TextField, TextArea, DatePicker, TimeField } from '@adobe/react-spectrum'
import { AddIcon } from '../../../components/icons/add'

export const SessionDetailComponent = () => {
  return (
    <View>
      <Flex>
      <DialogTrigger>
        <Button variant="secondary" style="fill" aria-label="Session Details">
            <AddIcon />
            <Text>Add new session</Text>
        </Button>
        {(close) => (
            <Dialog>
              <Heading>Session Details</Heading>
              <Content marginTop="size-100">
                <Flex direction="column" gap="size-100" width="100%">
                  <TextField label="Title" isRequired={true} width="100%" />
                  <TextArea label="Description" isRequired={true} width="100%" />
                  <Flex direction="row" gap="size-100" width="100%">
                    <DatePicker label="Date" isRequired={true} width="100%" />
                    <TimeField label="Start Time" isRequired hourCycle={12} width="100%" />
                    <TimeField label="End Time" isRequired hourCycle={12} width="100%" />
                  </Flex>
                </Flex>
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button variant="accent" onPress={close}>Confirm</Button>
              </ButtonGroup>
            </Dialog>
        )}
        </DialogTrigger>
      </Flex>
    </View>
  )
}