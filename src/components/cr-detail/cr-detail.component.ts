import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrApiService } from '../../api/cr-api.service';
import { SessionService } from '../../session/session.service';
import { CrDetail, TimelineEntry } from '../../models/cr.models';
import { idle, loading, ViewState } from '../../common/view-state';
import { computeDiff, DiffRow } from '../diff.util';
import { formatMoney } from '../../common/money.util';

/**
 * Change Request DETAIL page: loads a CR and renders the diff/preview, the approval timeline, and
 * permission-aware Approve/Reject actions. `load`, the diff binding, and the template skeleton are
 * provided; the timeline ordering, permission gating, actions, and reject validation are yours.
 */
@Component({
	selector: 'app-cr-detail',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule],
	templateUrl: './cr-detail.component.html',
})
export class CrDetailComponent implements OnInit {
	@Input() id!: string;

	state: ViewState<CrDetail> = idle();
	submitting = false;
	actionError?: string;
	// TODO: add validation so the form is invalid until a reason is entered.
	isApproving = false;
	isRejecting = false;

	rejectControl = new FormControl('',{
		nonNullable:true,
		validators:[Validators.required,Validators.minLength(3)]
	});

	constructor(private readonly api: CrApiService, private readonly session: SessionService) {}

	ngOnInit(): void {
		void this.load();
	}

	async load(): Promise<void> {
		this.state = loading();
		this.actionError = undefined;
		try {
			const detail = await this.api.getChangeRequest(this.session.user, this.id);
			this.state = { status: 'loaded', data: detail };
		} catch (err) {
			this.state = { status: 'error', data: null, error: (err as Error).message };
		}
	}

	get detail(): CrDetail | null {
		return this.state.data;
	}

	get diff(): DiffRow[] {
		return this.detail ? computeDiff(this.detail.baselineLineItems, this.detail.proposedLineItems) : [];
	}

	/** Approval timeline, oldest-first. */
	get timeline(): TimelineEntry[] {

		//null check
		if (!this.detail) return [];
		// TODO: return the audit entries ordered chronologically (oldest first).
		return [...this.detail.audit].sort((a, b) => {
			const timeA = new Date(a.at).getTime();
			const timeB = new Date(b.at).getTime();
			
			if (isNaN(timeA) && isNaN(timeB)) return 0;
			if (isNaN(timeA)) return 1;
			if (isNaN(timeB)) return -1;
			
			return timeA - timeB; 
		});
	}

	/** Whether the current user may approve the loaded CR. */
	get canApprove(): boolean {
		// NOTE: this only looks at the CR status. The UI must also respect the user's permissions.
		const perms = (this.session.user as any)?.permissions || [];
		const hasApprovePerm = perms.includes('cr_w') || perms.includes('cr_approve');
		
		return this.detail?.status === 'PENDING_APPROVAL' && hasApprovePerm;
	}

	get canReject(): boolean {
		// NOTE: this only looks at the CR status. The UI must also respect the user's permissions.
		const perms = (this.session.user as any)?.permissions || [];
		const hasRejectPerm = perms.includes('cr_w') || perms.includes('cr_reject');
		
		return this.detail?.status === 'PENDING_APPROVAL' && hasRejectPerm;
	}

	fmt(amount: number): string {
		return this.detail ? formatMoney(amount, this.detail.currency) : String(amount);
	}

	async approve(): Promise<void> {
		// TODO: perform the approve action through the API and reflect the outcome in the view.
		
		// must be loaded, 
		if (!this.detail || !this.canApprove || this.isApproving) return;

		this.isApproving = true;

		try{

			await this.api.approve(this.session.user, this.detail.id, new Date().toISOString());

			this.detail.status = 'APPROVED';
		}catch(err){
			this.actionError = (err as Error).message || 'Failed to approve the change request. Please try again.';
			console.error('Failed to approve CR:', err);
		}finally{
			this.isApproving = false;
		}
	}

	async reject(): Promise<void> {
		// TODO: require a valid rejectControl, then perform the reject action through the API and
		//       reflect the outcome in the view.

		if (!this.detail || !this.canReject || this.isRejecting) return;

		// Validate the rejectControl before proceeding
		if(this.rejectControl.invalid){
			this.rejectControl.markAsTouched();
			return;
		}

		this.isRejecting = true;

		try{

			await this.api.reject(this.session.user, this.detail.id, new Date().toISOString(),this.rejectControl.value?.trim() ?? '');

			this.detail.status = 'REJECTED';
			this.rejectControl.reset();
		}catch(err){
			this.actionError = (err as Error).message || 'Failed to reject CR';
			console.error('rejection failed:', err);
		}finally{
			this.isRejecting = false;
		}
	}
}
