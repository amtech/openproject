import {onClickOrEnter} from "../wp-fast-table/handlers/click-or-enter-handler";
// -- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
// ++
import {opWorkPackagesModule} from "../../angular-modules";
import {WorkPackageTableColumnsService} from "../wp-fast-table/state/wp-table-columns.service";
import {WorkPackageCollectionResource} from "../api/api-v3/hal-resources/wp-collection-resource.service";
import {WorkPackageResourceInterface} from "../api/api-v3/hal-resources/work-package-resource.service";
import {WorkPackageCreateService} from "../wp-create/wp-create.service";
import {WorkPackageCacheService} from "../work-packages/work-package-cache.service";
import {InlineCreateRowBuilder, inlineCreateCancelClassName} from "./inline-create-row-builder";
import {scopedObservable} from "../../helpers/angular-rx-utils";
import {States} from "../states.service";
import {WorkPackageEditForm} from "../wp-edit-form/work-package-edit-form";
import {WorkPackageTable} from "../wp-fast-table/wp-fast-table";

export class WorkPackageInlineCreateController {

  public resource:WorkPackageCollectionResource;
  public query:any;
  public projectIdentifier:string;
  public table: WorkPackageTable;

  public isHidden:boolean = false;
  public focus:boolean = false;

  public text:{ create: string };

  private currentWorkPackage:WorkPackageResourceInterface|null;
  private rowBuilder:InlineCreateRowBuilder;

  constructor(
    public $scope:ng.IScope,
    public $element:ng.IAugmentedJQuery,
    public $timeout:ng.ITimeoutService,
    public FocusHelper:any,
    public states:States,
    public wpCacheService:WorkPackageCacheService,
    public wpCreate:WorkPackageCreateService,
    public wpTableColumns:WorkPackageTableColumnsService
  ) {
    this.rowBuilder = new InlineCreateRowBuilder(this.table);
    this.text = {
      create: I18n.t('js.label_create_work_package')
    };

    // Remove temporary rows on creation of new work package
    scopedObservable(this.$scope, this.wpCacheService.onNewWorkPackage())
      .subscribe((wp:WorkPackageResourceInterface) => {

        if (this.currentWorkPackage === wp) {
          // Remove this row and add another
          this.removeWorkPackageRow();
          this.addWorkPackageRow();
        }
    });

    // Cancel edition of current new row
    this.$element.on('click keydown', `.${inlineCreateCancelClassName}`, (evt) => {
      onClickOrEnter(evt, () => {
        this.resetRow();
      });

      evt.stopImmediatePropagation();
      return false;
    });

    // Additionally, cancel on escape
    Mousetrap(this.$element[0]).bind('escape', () => {
      this.resetRow();
    });
  }

  public addWorkPackageRow() {
    this.wpCreate.createNewWorkPackage(this.projectIdentifier).then(wp => {
      this.currentWorkPackage = wp;
      (this.currentWorkPackage as any).inlineCreated = true;

      this.query.applyDefaultsFromFilters(this.currentWorkPackage);
      this.wpCacheService.updateWorkPackage(this.currentWorkPackage!);

      const form = new WorkPackageEditForm('new');
      const row = this.rowBuilder.buildNew(wp, form);
      this.$element.append(row);

      this.$timeout(() => {
        form.activateMissingFields();
        this.hideRow();
      });
    });
  }

  /**
   * Reset the new work package row and refocus on the button
   */
  public resetRow() {
    this.focus = true;
    this.removeWorkPackageRow();
    // Manually cancelled, show the row again
    this.$timeout(() => {
      this.showRow();
    }, 50);
  }

  public removeWorkPackageRow() {
    this.currentWorkPackage = null;
    this.states.editing.get('new').clear();
    this.states.workPackages.get('new').clear();
    this.$element.find('#wp-row-new').remove();
  }

  public showRow() {
    return this.isHidden = false;
  }

  public hideRow() {
    return this.isHidden = true;
  }

  public get colspan():number {
    return this.wpTableColumns.columnCount + 1;
  }

  public get isAllowed():boolean {
    return !!this.resource.createWorkPackage;
  }

}

function wpInlineCreate() {
  return {
    restrict: 'AE',
    templateUrl: '/components/wp-inline-create/wp-inline-create.directive.html',

    scope: {
      projectIdentifier: '=',
      resource: '=',
      query: '=',
      table: "="
    },

    bindToController: true,
    controllerAs: '$ctrl',
    controller: WorkPackageInlineCreateController
  }
}

opWorkPackagesModule.directive('wpInlineCreate', wpInlineCreate);
