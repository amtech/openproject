#-- copyright
# OpenProject is a project management system.
# Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License version 3.
#
# OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
# Copyright (C) 2006-2013 Jean-Philippe Lang
# Copyright (C) 2010-2013 the ChiliProject Team
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# See doc/COPYRIGHT.rdoc for more details.
#++

require 'spec_helper'

describe 'create users', type: :feature do
  let(:current_user) { FactoryGirl.create :admin }

  let(:auth_source) { FactoryGirl.build :dummy_auth_source }

  before do
    allow(User).to receive(:current).and_return current_user
  end

  shared_examples_for 'successful user creation' do
    let(:mail) { ActionMailer::Base.deliveries.last }
    let(:mail_body) { mail.body.parts.first.to_s }
    let(:token) { mail_body.scan(/token=(.*)$/).first.first }

    it 'creates the user' do
      expect(page).to have_selector('.flash', 'Successfully created.')

      new_user = User.order('created_on DESC').first

      expect(current_path).to eql(edit_user_path(new_user.id))
    end

    it 'sends out an activation email' do
      expect(mail_body).to include 'activate your account'
      expect(token).not_to be_nil
    end
  end

  context 'with internal authentication' do
    before do
      visit new_user_path

      fill_in 'First name', with: 'bobfirst'
      fill_in 'Last name', with: 'boblast'
      fill_in 'Email', with: 'bob@mail.com'

      click_button 'Create'
    end

    it_behaves_like 'successful user creation' do
      describe 'activation' do
        before do
          allow(User).to receive(:current).and_call_original

          visit "/account/activate?token=#{token}"
        end

        it 'shows the registration form' do
          expect(page).to have_text 'Create a new account'
        end

        it 'registers the user upon submission' do
          fill_in 'user_password', with: 'foobarbaz1'
          fill_in 'user_password_confirmation', with: 'foobarbaz1'

          click_button 'Submit'

          # landed on the 'my page'
          expect(page).to have_text 'your account has been activated'
          expect(page).to have_text 'Login: bob@mail.com'
        end
      end
    end
  end

  context 'with external authentication', js: true do
    before do
      auth_source.save!

      visit new_user_path

      fill_in 'First name', with: 'bobfirst'
      fill_in 'Last name', with: 'boblast'
      fill_in 'Email', with: 'bob@mail.com'

      select auth_source.name, from: 'Authentication mode'
      fill_in 'Login', with: 'bob'

      click_button 'Create'
    end

    it_behaves_like 'successful user creation' do
      describe 'activation' do
        before do
          allow(User).to receive(:current).and_call_original

          visit "/account/activate?token=#{token}"
        end

        it 'shows the login form prompting the user to login' do
          expect(page).to have_text 'Please login as bob to activate your account.'
        end

        it 'registers the user upon submission' do
          # login is already filled with 'bob'
          fill_in 'password', with: 'dummy' # accepted by DummyAuthSource

          click_button 'Sign in'

          # landed on the 'my page'
          expect(page).to have_text 'My account'
          expect(page).to have_text 'Login: bob'
        end
      end
    end
  end
end
